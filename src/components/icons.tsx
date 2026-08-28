// Ícones inline (stroke, 1.75px, grid 24) — evita depender de fonte de
// emoji do sistema (inconsistente entre SO/navegador) e de baixar um pacote
// de ícones externo.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconVisaoGeral = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
    p
  );

export const IconIA = (p: IconProps) =>
  base(
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
      <circle cx="12" cy="12" r="3.2" />
    </>,
    p
  );

export const IconCentral = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2 3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21" />
    </>,
    p
  );

export const IconSaude = (p: IconProps) =>
  base(
    <>
      <path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.7.7 4.9 2.2C11.7 4.7 13.4 3.7 15.4 4 19 4.5 20.6 8 20 11.7 17.5 16.4 12 21 12 21z" />
      <path d="M9 11h2l1-2 1.5 4L15 11h2" />
    </>,
    p
  );

export const IconEducacao = (p: IconProps) =>
  base(
    <>
      <path d="M2 8l10-4 10 4-10 4-10-4z" />
      <path d="M6 10.5v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" />
      <path d="M22 8v6" />
    </>,
    p
  );

export const IconObras = (p: IconProps) =>
  base(
    <>
      <path d="M14.5 3.5l6 6-2.1 2.1-6-6z" />
      <path d="M3 21l6.5-1.5L18 11 13 6l-8.5 8.5z" />
      <path d="M3 21l1.8-5.3L9 20z" />
    </>,
    p
  );

export const IconLicitacoes = (p: IconProps) =>
  base(
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>,
    p
  );

export const IconHistorico = (p: IconProps) =>
  base(
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H3" />
    </>,
    p
  );

export const IconAlertas = (p: IconProps) =>
  base(
    <>
      <path d="M12 3a5 5 0 00-5 5c0 5.3-2 6.5-2 7.5 0 .6.5 1 1.1 1h11.8c.6 0 1.1-.4 1.1-1 0-1-2-2.2-2-7.5a5 5 0 00-5-5z" />
      <path d="M10 19a2 2 0 004 0" />
    </>,
    p
  );

export const IconConfiguracoes = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 000-3l1-1.7-1.7-1.7-1.7 1a1.7 1.7 0 00-3 0l-1.7-1a1.7 1.7 0 00-1.7 1.7l-1 1.7a1.7 1.7 0 000 3l-1 1.7 1.7 1.7 1.7-1a1.7 1.7 0 003 0l1.7 1 1.7-1.7z" />
    </>,
    p
  );

export const IconModulos = (p: IconProps) =>
  base(
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 14h4" />
    </>,
    p
  );

export const IconSair = (p: IconProps) =>
  base(
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
    p
  );

export const IconDownload = (p: IconProps) =>
  base(
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>,
    p
  );

export const IconCaixaVazia = (p: IconProps) =>
  base(
    <>
      <path d="M3 8l9-5 9 5-9 5-9-5z" />
      <path d="M3 8v9l9 5 9-5V8" />
      <path d="M12 13v9" />
    </>,
    p
  );

export const IconChevronDown = (p: IconProps) => base(<path d="M6 9l6 6 6-6" />, p);

export const IconSetaCima = (p: IconProps) =>
  base(
    <>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </>,
    p
  );

export const IconSetaBaixo = (p: IconProps) =>
  base(
    <>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </>,
    p
  );

export const IconCheck = (p: IconProps) => base(<path d="M5 13l4 4L19 7" />, p);

export const IconX = (p: IconProps) => base(<path d="M6 6l12 12M18 6L6 18" />, p);
