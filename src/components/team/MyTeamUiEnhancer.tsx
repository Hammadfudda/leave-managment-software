import {
  useEffect,
} from 'react';

/*
 * Admin My Team presentation-only enhancement.
 *
 * No leave approval, attachment, balance, manager selection or API logic is
 * replaced. We only adjust DOM presentation after React has rendered the
 * existing MyTeam page.
 */
export default function MyTeamUiEnhancer() {
  useEffect(() => {
    let observer:
      MutationObserver | null =
        null;

    const apply = () => {
      if (
        window.location.pathname !==
        '/my-team'
      ) {
        return;
      }

      const selected =
        document.querySelector(
          'button.border-blue-400'
        ) as HTMLElement | null;

      if (!selected) {
        return;
      }

      const container =
        selected.parentElement;

      if (!container) {
        return;
      }

      container.style.display =
        'flex';
      container.style.gridTemplateColumns =
        'none';
      container.style.overflowX =
        'auto';
      container.style.overflowY =
        'hidden';
      container.style.paddingBottom =
        '8px';
      container.style.scrollSnapType =
        'x proximity';

      Array.from(
        container.children
      ).forEach(
        (child) => {
          const el =
            child as HTMLElement;

          el.style.flex =
            '0 0 300px';
          el.style.minWidth =
            '300px';
          el.style.scrollSnapAlign =
            'start';
        }
      );

      /*
       * Once a manager is selected the manager cards become a compact
       * horizontal strip. Hide the redundant blue "Showing team reporting to"
       * banner so Team / Leave Requests moves directly underneath the strip.
       */
      const allDivs =
        Array.from(
          document.querySelectorAll(
            'div'
          )
        ) as HTMLElement[];

      const banner =
        allDivs.find(
          (el) =>
            el.textContent
              ?.trim()
              .startsWith(
                'Showing team reporting to'
              )
        );

      if (
        banner
      ) {
        banner.style.display =
          'none';
      }
    };

    const timer =
      window.setInterval(
        apply,
        300
      );

    observer =
      new MutationObserver(
        apply
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          'class',
        ],
      }
    );

    apply();

    return () => {
      window.clearInterval(
        timer
      );

      observer?.disconnect();
    };
  }, []);

  return null;
}
