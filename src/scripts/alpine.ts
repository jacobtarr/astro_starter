import type { Alpine } from 'alpinejs';

export default (Alpine: Alpine) => {
  Alpine.data('headerState', () => ({
    open: false,

    init() {
      this.$watch('open', (v: boolean) => {
        document.body.classList.toggle('mobile-menu-is-active', v);
      });
    },
  }));
};