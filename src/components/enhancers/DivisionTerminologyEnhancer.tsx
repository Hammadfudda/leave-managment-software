import {
  useEffect,
} from 'react';

function replaceVisibleText(
  value: string
) {
  return value
    .replace(
      /\bHR Roles\b/g,
      'Divisions'
    )
    .replace(
      /\bHR Role\b/g,
      'Division'
    )
    .replace(
      /\bRoles\b/g,
      'Divisions'
    )
    .replace(
      /\bRole\b/g,
      'Division'
    )
    .replace(
      /\broles\b/g,
      'divisions'
    )
    .replace(
      /\brole\b/g,
      'division'
    );
}

export default function DivisionTerminologyEnhancer() {
  useEffect(
    () => {
      let running =
        false;

      const enhance =
        () => {
          if (
            running
          ) {
            return;
          }

          running =
            true;

          try {
            /*
             * Walk TEXT NODES instead of replacing whole element.textContent.
             * This keeps icons/buttons/components intact while changing
             * "Role" wording even when the element has child SVGs.
             */
            const walker =
              document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT
              );

            let node =
              walker.nextNode();

            while (
              node
            ) {
              const parent =
                node.parentElement;

              if (
                parent &&
                ![
                  'SCRIPT',
                  'STYLE',
                ].includes(
                  parent.tagName
                )
              ) {
                const text =
                  node.nodeValue ||
                  '';

                if (
                  /\b(role|roles)\b/i.test(
                    text
                  )
                ) {
                  const next =
                    replaceVisibleText(
                      text
                    );

                  if (
                    next !==
                    text
                  ) {
                    node.nodeValue =
                      next;
                  }
                }
              }

              node =
                walker.nextNode();
            }

            const fields =
              Array.from(
                document.querySelectorAll(
                  'input[placeholder],textarea[placeholder]'
                )
              );

            for (
              const item
              of fields
            ) {
              const field =
                item as
                  | HTMLInputElement
                  | HTMLTextAreaElement;

              if (
                /\b(role|roles)\b/i.test(
                  field.placeholder
                )
              ) {
                field.placeholder =
                  replaceVisibleText(
                    field.placeholder
                  );
              }
            }
          } finally {
            running =
              false;
          }
        };

      const observer =
        new MutationObserver(
          enhance
        );

      observer.observe(
        document.body,
        {
          childList:
            true,
          subtree:
            true,
          characterData:
            true,
        }
      );

      enhance();

      return () =>
        observer.disconnect();
    },
    []
  );

  return null;
}
