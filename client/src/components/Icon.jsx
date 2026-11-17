const paths = {
  home: "m3 10 9-7 9 7v10H3Z M9 20v-7h6v7",
  building: "M4 21V5h16v16 M9 21v-5h6v5 M8 9h1m6 0h1M8 12h1m6 0h1M2 21h20",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8m2 4a4 4 0 0 1 3 4v2",
  clipboard: "M8 5H4v17h16V5h-4 M8 2h8v6H8Z M8 12h8m-8 5h5",
  car: "m5 6-2 7v6h18v-6l-2-7Z M3 12h18 M6 16h2m8 0h2M5 19v3m14-3v3",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 5 7 7",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2",
  check: "m5 12 4 4L19 6",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z m-4 10 3 3 5-6",
  exit: "M9 3H3v18h6 M9 12h13m-5-5 5 5-5 5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 4v16M4 12h16",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
};

export default function Icon({ name = "building", size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.building} /></svg>;
}
