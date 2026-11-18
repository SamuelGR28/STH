/* =========================================================
   SJTS – Ilustraciones y colores de los sectores
   Lo usan la tienda (app.js) y la administración (admin.js).
   Para un sector nuevo, el administrador elige uno de estos
   íconos y un color en admin.html > Sectores.
   ========================================================= */
window.STH_UI = (() => {
  const ICONOS = {
    velas:     { nombre: "Vela",       svg: '<path d="M24 30h16v26H24z"/><path d="M32 30v-6"/><path d="M32 10c4 5 5 8 0 12-5-4-4-7 0-12z"/><path d="M20 56h24"/>' },
    cuadernos: { nombre: "Cuaderno",   svg: '<rect x="16" y="8" width="34" height="48" rx="3"/><path d="M16 16h-4M16 26h-4M16 36h-4M16 46h-4"/><path d="M26 20h16M26 28h16M26 36h10"/>' },
    papeleria: { nombre: "Lápiz",      svg: '<path d="M14 50 44 20l6 6-30 30h-6z"/><path d="m40 24 6 6"/><path d="M14 50l-2 8 8-2"/><circle cx="48" cy="48" r="6"/>' },
    vasos:     { nombre: "Taza",       svg: '<path d="M14 18h30l-4 38H18z"/><path d="M44 26h4a6 6 0 0 1 0 12h-6"/><path d="M24 6c-2 3 2 5 0 8M32 6c-2 3 2 5 0 8"/>' },
    camisas:   { nombre: "Camiseta",   svg: '<path d="M22 8 8 16l6 12 6-3v31h24V25l6 3 6-12-14-8c-2 5-6 7-10 7s-8-2-10-7z"/>' },
    ropa:      { nombre: "Gancho",     svg: '<path d="M32 14a5 5 0 1 1 5 5c-3 0-5 2-5 4v2"/><path d="M32 25 6 46h52z"/><path d="M6 46v4h52v-4"/>' },
    regalo:    { nombre: "Regalo",     svg: '<rect x="10" y="24" width="44" height="32" rx="2"/><path d="M8 16h48v8H8zM32 16v40"/><path d="M32 16c-4-8-14-8-12-2 1 3 8 2 12 2zM32 16c4-8 14-8 12-2-1 3-8 2-12 2z"/>' },
    alcancia:  { nombre: "Alcancía",   svg: '<ellipse cx="32" cy="36" rx="20" ry="15"/><path d="M26 20h12"/><path d="M50 32h6v8h-5M20 49l-2 7M42 49l2 7"/><circle cx="42" cy="32" r="1.5"/><path d="M14 30c-4-1-6 2-4 5"/>' },
    corazon:   { nombre: "Corazón",    svg: '<path d="M32 54S10 40 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 30-22 30z"/>' },
    estrella:  { nombre: "Estrella",   svg: '<path d="m32 8 7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z"/>' },
    hilo:      { nombre: "Hilo",       svg: '<rect x="20" y="10" width="24" height="6" rx="2"/><rect x="20" y="48" width="24" height="6" rx="2"/><path d="M24 16v32M40 16v32M24 22l16 6M24 30l16 6M24 38l16 6"/><path d="M44 30c8 2 10 10 6 18"/>' },
    hogar:     { nombre: "Casa",       svg: '<path d="M10 30 32 12l22 18"/><path d="M16 26v28h32V26"/><path d="M27 54V40h10v14"/>' }
  };

  const svg = (clave) =>
    `<svg viewBox="0 0 64 64" fill="none" stroke="#2b2220" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(ICONOS[clave] || ICONOS.estrella).svg}</svg>`;

  // Color de fondo del sector: el que eligió el administrador o el de css/styles.css.
  const estilo = (sector, id) => {
    const c = sector && /^#[0-9a-f]{6}$/i.test(sector.color || "") ? sector.color : `var(--c-${id}, var(--tint))`;
    return `--sc: ${c}`;
  };

  return { ICONOS, svg, estilo };
})();
