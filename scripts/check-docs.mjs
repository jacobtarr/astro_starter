// scripts/check-docs.mjs
import tsModule from 'typescript';
const ts = tsModule;
import fs from 'node:fs';
import { glob } from 'glob';

const FIX = process.argv.includes('--fix');

function extractPropsFromSource(source) {
  const sourceFile = ts.createSourceFile('temp.ts', source, ts.ScriptTarget.Latest, true);
  const props = [];

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'Props') {
      node.members.forEach(member => {
        if (ts.isPropertySignature(member)) {
          props.push({
            name: member.name.getText(),
            optional: !!member.questionToken,
            type: member.type?.getText() ?? 'unknown',
          });
        }
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return props;
}

// Finds the "  Props:\n" line and captures everything up to the first
// truly blank line (a line with nothing but whitespace).
function findDocblockPropsBlock(content) {
  const lines = content.split('\n');
  const propsIndex = lines.findIndex(line => /^\s*Props:\s*$/.test(line));
  if (propsIndex === -1) return null;

  const bodyLines = [];
  let bodyStartIndex = -1;
  let endIndex = lines.length;
  let hasLeadingBlankLine = false;

  for (let i = propsIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      // Blank line before any real content — note it, then skip past it.
      if (bodyLines.length === 0) {
        hasLeadingBlankLine = true;
        continue;
      }
      // Blank line after real content — this is the true end of the block.
      endIndex = i;
      break;
    }

    if (bodyStartIndex === -1) bodyStartIndex = i;
    bodyLines.push(line);
    endIndex = i + 1;
  }

  if (bodyStartIndex === -1) return null;

  return {
    propsIndex,
    bodyStartIndex,
    bodyEndIndex: endIndex,
    bodyLines,
    hasLeadingBlankLine,
  };
}

// A prop line looks like:  `    name?: Type<Stuff>    # Description text`
// The comment delimiter is a '#' with at least one space before it AND
// at least one space after it. This avoids false positives on a literal
// '#' inside the description itself, e.g. "(default: '#')".
function parsePropLine(line) {
  const nameMatch = line.match(/^\s*(\w+)(\?)?:/);
  if (!nameMatch) return null;

  const commentMatch = line.match(/[ \t]#[ \t]/);
  const hasComment = !!commentMatch;
  const hashIndex = hasComment ? commentMatch.index + 1 : -1;

  const description = hasComment ? line.slice(hashIndex + 1).trim() : '';
  const typeSection = hasComment ? line.slice(0, hashIndex) : line;
  const type = typeSection.replace(/^\s*\w+\??:\s*/, '').trim();

  return {
    raw: line,
    name: nameMatch[1],
    optional: !!nameMatch[2],
    type,
    hasComment,
    description,
  };
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const frontmatterStartOffset = content.indexOf(frontmatter);

  const interfaceProps = extractPropsFromSource(frontmatter);
  if (interfaceProps.length === 0) return null;

  const frontmatterLines = frontmatter.split('\n');
  const docBlock = findDocblockPropsBlock(frontmatter);

  const docLines = docBlock
    ? docBlock.bodyLines.map(parsePropLine).filter(Boolean)
    : [];
  const docPropNames = docLines.map(l => l.name);

  const missingProps = interfaceProps.filter(p => !docPropNames.includes(p.name));
  const staleNames = docPropNames.filter(
    name => !interfaceProps.some(p => p.name === name)
  );

  const missingDescriptions = docLines
    .filter(l => !l.hasComment || !l.description)
    .map(l => l.name);
  const placeholderDescriptions = docLines
    .filter(l => l.description === 'Description')
    .map(l => l.name);

  // Check alignment: do all '#' characters sit at the same column?
  const commentColumns = docLines
    .filter(l => l.hasComment)
    .map(l => l.raw.indexOf('#'));
  const misaligned = commentColumns.length > 1 && new Set(commentColumns).size > 1;

  const hasLeadingBlankLine = docBlock?.hasLeadingBlankLine ?? false;

  const hasIssues =
    missingProps.length > 0 ||
    staleNames.length > 0 ||
    missingDescriptions.length > 0 ||
    placeholderDescriptions.length > 0 ||
    misaligned ||
    hasLeadingBlankLine;

  if (!hasIssues) return null;

  const result = {
    filePath,
    missingProps,
    staleNames,
    missingDescriptions,
    placeholderDescriptions,
    misaligned,
    hasLeadingBlankLine,
    fixed: false,
  };

  if (FIX && docBlock && (missingProps.length > 0 || misaligned || hasLeadingBlankLine)) {
    // Column width based only on "normal" length signatures, so a single
    // very long/complex inline type doesn't blow out the whole alignment.
    const normalSignatures = interfaceProps
      .map(ip => `${ip.name}${ip.optional ? '?' : ''}: ${ip.type}`)
      .filter(sig => sig.length <= 50);
    const columnWidth = normalSignatures.length
      ? Math.max(...normalSignatures.map(s => s.length))
      : 20;

    const existingByName = new Map(docLines.map(l => [l.name, l]));

    const newBodyLines = interfaceProps.map(p => {
      const existing = existingByName.get(p.name);
      const signature = `${p.name}${p.optional ? '?' : ''}: ${p.type}`;
      const description = existing?.hasComment && existing.description
        ? existing.description
        : 'Description';

      // Preserve unusually long/complex lines exactly as-is rather than
      // trying to force them into the aligned column.
      if (signature.length > 50) {
        return existing ? existing.raw : `    ${signature}    # ${description}`;
      }

      const padding = ' '.repeat(Math.max(1, columnWidth - signature.length + 4));
      return `    ${signature}${padding}# ${description}`;
    });

    const newFrontmatterLines = [
      ...frontmatterLines.slice(0, docBlock.propsIndex + 1),
      ...newBodyLines,
      ...frontmatterLines.slice(docBlock.bodyEndIndex),
    ];

    const newFrontmatter = newFrontmatterLines.join('\n');
    const newContent =
      content.slice(0, frontmatterStartOffset) +
      newFrontmatter +
      content.slice(frontmatterStartOffset + frontmatter.length);

    fs.writeFileSync(filePath, newContent, 'utf-8');
    result.fixed = true;
  }

  return result;
}

async function main() {
  const target = process.argv.find(arg => arg.endsWith('.astro'));
  const files = target
    ? [target]
    : await glob('src/{components,patterns,blocks,globals}/**/*.astro');

  console.log(`Checking ${files.length} component(s) for docblock drift...\n`);

  const issues = files.map(checkFile).filter(Boolean);

  if (issues.length === 0) {
    console.log('✓ All component docblocks are in sync with their interfaces.\n');
    return;
  }

  issues.forEach(({ filePath, missingProps, staleNames, missingDescriptions, placeholderDescriptions, misaligned, hasLeadingBlankLine, fixed }) => {
    console.log(`⚠️  ${filePath}`);
    if (missingProps.length) {
      const names = missingProps.map(p => p.name).join(', ');
      console.log(fixed ? `   Added to docblock: ${names}` : `   Missing from docblock: ${names}`);
    }
    if (staleNames.length) {
      console.log(`   Stale in docblock (no longer in interface, remove manually): ${staleNames.join(', ')}`);
    }
    if (missingDescriptions.length) {
      console.log(`   Missing description: ${missingDescriptions.join(', ')}`);
    }
    if (placeholderDescriptions.length) {
      console.log(`   Still has placeholder "# Description": ${placeholderDescriptions.join(', ')}`);
    }
    if (misaligned) {
      console.log('   Comment columns are not aligned (run --fix to realign)');
    }
    if (hasLeadingBlankLine) {
      console.log(fixed ? '   Removed blank line after Props:' : '   Blank line after Props: (run --fix to remove)');
    }
    console.log('');
  });

  console.log(`Found ${issues.length} file(s) with docblock drift.`);
  if (!FIX) {
    console.log('Run with --fix to auto-add missing props and realign columns.\n');
    process.exitCode = 1;
  } else {
    console.log('');
  }
}

main().catch(err => {
  console.error('check-docs failed:', err);
  process.exitCode = 1;
});
