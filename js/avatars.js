/**
 * Swappo Avatar System
 * 32 unique SVG avatars organized in 16 pairs
 * Anyone can pick any avatar — no gender filtering
 * Colors: Main #09B1BA, Detail #078A91, Background #F0F0F0
 */

const SWAPPO_AVATARS = {
  // ── Pair 1: Happy ──
  happy: {
    name: 'Happy', pair: 1,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><circle cx="33" cy="33" r="3" fill="#fff"/><circle cx="47" cy="33" r="3" fill="#fff"/><path d="M30 43 Q40 53 50 43" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="38" r="4" fill="#078A91" opacity="0.3"/><circle cx="56" cy="38" r="4" fill="#078A91" opacity="0.3"/></svg>'
  },
  happy_girl: {
    name: 'Happy Girl', pair: 1,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><circle cx="33" cy="33" r="3" fill="#fff"/><circle cx="47" cy="33" r="3" fill="#fff"/><path d="M30 43 Q40 53 50 43" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="38" r="4" fill="#078A91" opacity="0.3"/><circle cx="56" cy="38" r="4" fill="#078A91" opacity="0.3"/><path d="M20 24 Q24 14 40 12 Q56 14 60 24" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 26 Q16 36 20 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M62 26 Q64 36 60 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="60" cy="18" r="3" fill="#FF69B4" opacity="0.7"/></svg>'
  },

  // ── Pair 2: Cool ──
  cool: {
    name: 'Cool', pair: 2,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><rect x="24" y="30" width="32" height="10" rx="5" fill="#078A91"/><rect x="26" y="32" width="12" height="6" rx="3" fill="#333"/><rect x="42" y="32" width="12" height="6" rx="3" fill="#333"/><line x1="38" y1="35" x2="42" y2="35" stroke="#078A91" stroke-width="2"/><path d="M33 46 Q40 50 47 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
  },
  cool_girl: {
    name: 'Cool Girl', pair: 2,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><rect x="24" y="30" width="32" height="10" rx="5" fill="#078A91"/><rect x="26" y="32" width="12" height="6" rx="3" fill="#333"/><rect x="42" y="32" width="12" height="6" rx="3" fill="#333"/><line x1="38" y1="35" x2="42" y2="35" stroke="#078A91" stroke-width="2"/><path d="M33 46 Q40 50 47 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 22 Q28 10 40 10 Q52 10 58 22" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 24 Q18 34 22 42" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 24 Q62 34 58 42" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="30" r="3" fill="#FFD700"/><circle cx="64" cy="30" r="3" fill="#FFD700"/></svg>'
  },

  // ── Pair 3: Star ──
  star: {
    name: 'Star', pair: 3,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="36" r="3" fill="#fff"/><circle cx="46" cy="36" r="3" fill="#fff"/><path d="M35 45 Q40 50 45 45" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><polygon points="40,4 43,14 53,14 45,20 48,30 40,24 32,30 35,20 27,14 37,14" fill="#FFD700" stroke="#E6C200" stroke-width="1"/></svg>'
  },
  star_girl: {
    name: 'Star Girl', pair: 3,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="36" r="3" fill="#fff"/><circle cx="46" cy="36" r="3" fill="#fff"/><path d="M35 45 Q40 50 45 45" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><polygon points="40,4 43,14 53,14 45,20 48,30 40,24 32,30 35,20 27,14 37,14" fill="#FFD700" stroke="#E6C200" stroke-width="1"/><path d="M22 26 Q30 16 40 14 Q50 16 58 26" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 28 Q18 38 22 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 28 Q62 38 58 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><polygon points="16,10 17.5,6 19,10 17.5,8" fill="#FFD700" opacity="0.7"/><polygon points="62,8 63.5,4 65,8 63.5,6" fill="#FFD700" opacity="0.7"/></svg>'
  },

  // ── Pair 4: Ninja ──
  ninja: {
    name: 'Ninja', pair: 4,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><rect x="18" y="28" width="44" height="14" rx="4" fill="#078A91"/><ellipse cx="33" cy="35" rx="5" ry="4" fill="#1a1a1a"/><ellipse cx="47" cy="35" rx="5" ry="4" fill="#1a1a1a"/><circle cx="33" cy="35" r="2.5" fill="#fff"/><circle cx="47" cy="35" r="2.5" fill="#fff"/><rect x="18" y="42" width="44" height="8" rx="3" fill="#078A91"/></svg>'
  },
  ninja_girl: {
    name: 'Ninja Girl', pair: 4,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="38" r="22" fill="#09B1BA"/><rect x="18" y="28" width="44" height="14" rx="4" fill="#078A91"/><ellipse cx="33" cy="35" rx="5" ry="4" fill="#1a1a1a"/><ellipse cx="47" cy="35" rx="5" ry="4" fill="#1a1a1a"/><circle cx="33" cy="35" r="2.5" fill="#fff"/><circle cx="47" cy="35" r="2.5" fill="#fff"/><rect x="18" y="42" width="44" height="8" rx="3" fill="#078A91"/><path d="M56 24 Q58 16 64 14" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 16 L66 12" stroke="#333" stroke-width="2" stroke-linecap="round"/><path d="M62 20 L68 18" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle cx="66" cy="12" r="2" fill="#E74C3C" opacity="0.6"/></svg>'
  },

  // ── Pair 5: Plantie ──
  plantie: {
    name: 'Plantie', pair: 5,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="20" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M36 47 Q40 51 44 47" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M40 22 C40 22 34 14 28 18 C22 22 30 26 40 22Z" fill="#2ECC71"/><path d="M40 22 C40 22 46 14 52 18 C58 22 50 26 40 22Z" fill="#27AE60"/><line x1="40" y1="22" x2="40" y2="16" stroke="#2ECC71" stroke-width="2" stroke-linecap="round"/></svg>'
  },
  plantie_girl: {
    name: 'Plantie Girl', pair: 5,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="20" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M36 47 Q40 51 44 47" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M34 22 C34 22 28 14 22 18 C16 22 24 26 34 22Z" fill="#2ECC71"/><path d="M46 22 C46 22 52 14 58 18 C64 22 56 26 46 22Z" fill="#27AE60"/><path d="M40 20 C40 20 36 12 30 16 C24 20 32 24 40 20Z" fill="#2ECC71" opacity="0.8"/><path d="M40 20 C40 20 44 12 50 16 C56 20 48 24 40 20Z" fill="#27AE60" opacity="0.8"/><line x1="34" y1="22" x2="34" y2="16" stroke="#2ECC71" stroke-width="2" stroke-linecap="round"/><line x1="46" y1="22" x2="46" y2="16" stroke="#27AE60" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="12" r="3" fill="#FF69B4" opacity="0.6"/></svg>'
  },

  // ── Pair 6: Lovely ──
  lovely: {
    name: 'Lovely', pair: 6,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><path d="M30 36 L34 32 L38 36 L34 40Z" fill="#fff"/><path d="M42 36 L46 32 L50 36 L46 40Z" fill="#fff"/><path d="M33 47 Q40 54 47 47" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M34 8 C30 4 22 4 22 12 C22 20 34 26 34 26 C34 26 46 20 46 12 C46 4 38 4 34 8Z" fill="#E74C3C" opacity="0.8"/></svg>'
  },
  lovely_girl: {
    name: 'Lovely Girl', pair: 6,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><path d="M30 36 L34 32 L38 36 L34 40Z" fill="#fff"/><path d="M42 36 L46 32 L50 36 L46 40Z" fill="#fff"/><path d="M33 47 Q40 54 47 47" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M34 8 C30 4 22 4 22 12 C22 20 34 26 34 26 C34 26 46 20 46 12 C46 4 38 4 34 8Z" fill="#E74C3C" opacity="0.8"/><path d="M46 8 C42 4 50 2 56 6 C62 10 54 16 46 14" fill="#E74C3C" opacity="0.6"/><path d="M22 24 Q20 14 24 10" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M58 24 Q60 14 56 10" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M24 26 Q18 36 22 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 26 Q62 36 58 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
  },

  // ── Pair 7: Techie ──
  techie: {
    name: 'Techie', pair: 7,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="33" cy="36" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="47" cy="36" r="6" fill="none" stroke="#fff" stroke-width="2"/><line x1="39" y1="36" x2="41" y2="36" stroke="#fff" stroke-width="2"/><circle cx="33" cy="36" r="2" fill="#fff"/><circle cx="47" cy="36" r="2" fill="#fff"/><line x1="27" y1="36" x2="20" y2="33" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="53" y1="36" x2="60" y2="33" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M36 48 L44 48" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect x="28" y="62" width="24" height="6" rx="2" fill="#078A91"/><rect x="32" y="60" width="16" height="4" rx="1" fill="#09B1BA"/></svg>'
  },
  techie_girl: {
    name: 'Techie Girl', pair: 7,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="33" cy="36" r="6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="47" cy="36" r="6" fill="none" stroke="#fff" stroke-width="2"/><line x1="39" y1="36" x2="41" y2="36" stroke="#fff" stroke-width="2"/><circle cx="33" cy="36" r="2" fill="#fff"/><circle cx="47" cy="36" r="2" fill="#fff"/><line x1="27" y1="36" x2="20" y2="33" stroke="#fff" stroke-width="2" stroke-linecap="round"/><line x1="53" y1="36" x2="60" y2="33" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M36 48 L44 48" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M22 24 Q30 12 40 10 Q50 12 58 24" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 26 Q18 36 22 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 26 Q62 36 58 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="28" y="62" width="24" height="6" rx="2" fill="#078A91"/><rect x="32" y="60" width="16" height="4" rx="1" fill="#09B1BA"/></svg>'
  },

  // ── Pair 8: Royal ──
  royal: {
    name: 'Royal', pair: 8,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M35 48 Q40 52 45 48" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 22 L28 12 L34 20 L40 8 L46 20 L52 12 L56 22 Z" fill="#FFD700"/><rect x="24" y="22" width="32" height="5" rx="1" fill="#E6C200"/><circle cx="40" cy="12" r="2.5" fill="#E74C3C"/><circle cx="30" cy="17" r="2" fill="#3498DB"/><circle cx="50" cy="17" r="2" fill="#3498DB"/></svg>'
  },
  royal_girl: {
    name: 'Royal Girl', pair: 8,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M35 48 Q40 52 45 48" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M26 20 L30 10 L35 18 L40 6 L45 18 L50 10 L54 20 Z" fill="#FFD700"/><rect x="26" y="20" width="28" height="4" rx="1" fill="#E6C200"/><circle cx="40" cy="10" r="2" fill="#E74C3C"/><circle cx="32" cy="15" r="1.5" fill="#9B59B6"/><circle cx="48" cy="15" r="1.5" fill="#9B59B6"/><path d="M22 26 Q28 14 40 12 Q52 14 58 26" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 28 Q18 38 22 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 28 Q62 38 58 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
  },

  // ── Pair 9: Mecano ──
  mecano: {
    name: 'Mecano', pair: 9,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="33" cy="36" r="5" fill="#078A91"/><circle cx="33" cy="36" r="3" fill="#fff"/><circle cx="33" cy="36" r="1.5" fill="#078A91"/><circle cx="47" cy="36" r="5" fill="#078A91"/><circle cx="47" cy="36" r="3" fill="#fff"/><circle cx="47" cy="36" r="1.5" fill="#078A91"/><path d="M35 46 Q40 50 45 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="26" y="10" width="28" height="14" rx="4" fill="#FFD700"/><rect x="30" y="6" width="20" height="8" rx="3" fill="#E6C200"/><circle cx="40" cy="10" r="3" fill="#078A91"/><path d="M26 14 L20 18" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/><path d="M54 14 L60 18" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/></svg>'
  },
  mecano_girl: {
    name: 'Mecano Girl', pair: 9,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="33" cy="36" r="5" fill="#078A91"/><circle cx="33" cy="36" r="3" fill="#fff"/><circle cx="33" cy="36" r="1.5" fill="#078A91"/><circle cx="47" cy="36" r="5" fill="#078A91"/><circle cx="47" cy="36" r="3" fill="#fff"/><circle cx="47" cy="36" r="1.5" fill="#078A91"/><path d="M35 46 Q40 50 45 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="26" y="10" width="28" height="14" rx="4" fill="#FFD700"/><rect x="30" y="6" width="20" height="8" rx="3" fill="#E6C200"/><circle cx="40" cy="10" r="3" fill="#078A91"/><path d="M22 24 Q28 16 40 14 Q52 16 58 24" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 26 Q18 36 22 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 26 Q62 36 58 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>'
  },

  // ── Pair 10: Bricoleur ──
  bricoleur: {
    name: 'Bricoleur', pair: 10,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M35 49 Q40 53 45 49" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="22" y="16" width="36" height="12" rx="2" fill="#E67E22"/><rect x="22" y="16" width="36" height="4" rx="2" fill="#D35400"/><rect x="56" y="8" width="6" height="20" rx="2" fill="#888" transform="rotate(30 59 18)"/><rect x="56" y="6" width="6" height="8" rx="1" fill="#E74C3C" transform="rotate(30 59 10)"/></svg>'
  },
  bricoleuse: {
    name: 'Bricoleuse', pair: 10,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><circle cx="34" cy="39" r="2.5" fill="#fff"/><circle cx="46" cy="39" r="2.5" fill="#fff"/><path d="M35 49 Q40 53 45 49" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="22" y="16" width="36" height="12" rx="2" fill="#E67E22"/><rect x="22" y="16" width="36" height="4" rx="2" fill="#D35400"/><path d="M22 24 Q28 14 40 12 Q52 14 58 24" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 26 Q18 36 22 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 26 Q62 36 58 44" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="8" y="10" width="5" height="16" rx="1.5" fill="#888"/><rect x="8" y="8" width="5" height="6" rx="1" fill="#3498DB"/></svg>'
  },

  // ── Pair 11: Kitty / Chic ──
  kitty: {
    name: 'Kitty', pair: 11,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><polygon points="22,30 20,10 34,24" fill="#09B1BA"/><polygon points="58,30 60,10 46,24" fill="#09B1BA"/><polygon points="23,28 22,14 33,24" fill="#078A91"/><polygon points="57,28 58,14 47,24" fill="#078A91"/><ellipse cx="33" cy="38" rx="4" ry="4.5" fill="#fff"/><ellipse cx="47" cy="38" rx="4" ry="4.5" fill="#fff"/><ellipse cx="33" cy="39" rx="1.5" ry="3" fill="#333"/><ellipse cx="47" cy="39" rx="1.5" ry="3" fill="#333"/><ellipse cx="40" cy="46" rx="3" ry="2" fill="#078A91"/><line x1="18" y1="42" x2="28" y2="40" stroke="#078A91" stroke-width="1.5"/><line x1="18" y1="46" x2="28" y2="44" stroke="#078A91" stroke-width="1.5"/><line x1="62" y1="42" x2="52" y2="40" stroke="#078A91" stroke-width="1.5"/><line x1="62" y1="46" x2="52" y2="44" stroke="#078A91" stroke-width="1.5"/></svg>'
  },
  chic: {
    name: 'Chic', pair: 11,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="42" r="22" fill="#09B1BA"/><ellipse cx="34" cy="39" rx="2" ry="2.5" fill="#fff"/><ellipse cx="46" cy="39" rx="2" ry="2.5" fill="#fff"/><path d="M37 48 Q40 50 43 48" stroke="#E74C3C" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="16" rx="22" ry="10" fill="#333"/><path d="M18 18 Q18 28 24 30" stroke="#333" stroke-width="3" fill="none"/><path d="M62 18 Q62 28 56 30" stroke="#333" stroke-width="3" fill="none"/><ellipse cx="40" cy="14" rx="18" ry="4" fill="#444"/><rect x="20" y="10" width="40" height="6" rx="3" fill="#333"/><circle cx="24" cy="42" r="3" fill="#FFD700" opacity="0.6"/><circle cx="56" cy="42" r="3" fill="#FFD700" opacity="0.6"/></svg>'
  },

  // ── Pair 12: Sporty / Athlete ──
  sporty: {
    name: 'Sporty', pair: 12,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="37" r="2.5" fill="#fff"/><circle cx="46" cy="37" r="2.5" fill="#fff"/><path d="M32 45 Q40 52 48 45" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 28 Q40 20 62 28" stroke="#E74C3C" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M18 28 Q40 20 62 28" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="0 8 0"/><circle cx="58" cy="60" r="10" fill="none" stroke="#078A91" stroke-width="2.5"/><path d="M52 54 L64 66 M52 66 L64 54" stroke="#078A91" stroke-width="1.5"/></svg>'
  },
  athlete: {
    name: 'Athlete', pair: 12,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="36" r="2.5" fill="#fff"/><circle cx="46" cy="36" r="2.5" fill="#fff"/><path d="M32 45 Q40 52 48 45" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 34 Q40 26 62 34" fill="#078A91"/><path d="M18 34 Q40 26 62 34" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M20 30 Q25 14 40 16 Q55 14 60 30" stroke="#333" stroke-width="2" fill="none"/><path d="M24 16 Q40 10 56 16" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="62" cy="62" r="8" fill="#FFD700"/><text x="62" y="66" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">1</text></svg>'
  },

  // ── Pair 13: Yogi / Sunny ──
  yogi: {
    name: 'Yogi', pair: 13,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="36" r="20" fill="#09B1BA"/><line x1="33" y1="33" x2="37" y2="33" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><line x1="43" y1="33" x2="47" y2="33" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M37 41 Q40 44 43 41" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="40" cy="12" r="4" fill="none" stroke="#078A91" stroke-width="1.5" opacity="0.4"/><circle cx="40" cy="12" r="8" fill="none" stroke="#078A91" stroke-width="1" opacity="0.25"/><circle cx="40" cy="12" r="12" fill="none" stroke="#078A91" stroke-width="0.8" opacity="0.15"/><path d="M24 62 L32 56 L40 64 L48 56 L56 62" stroke="#078A91" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  sunny: {
    name: 'Sunny', pair: 13,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="37" r="3" fill="#fff"/><circle cx="46" cy="37" r="3" fill="#fff"/><path d="M31 45 Q40 55 49 45" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="27" cy="42" r="4" fill="#F39C12" opacity="0.4"/><circle cx="53" cy="42" r="4" fill="#F39C12" opacity="0.4"/><line x1="40" y1="4" x2="40" y2="12" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/><line x1="58" y1="10" x2="54" y2="17" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/><line x1="22" y1="10" x2="26" y2="17" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/><line x1="66" y1="24" x2="60" y2="26" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="24" x2="20" y2="26" stroke="#F39C12" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="40" x2="17" y2="40" stroke="#F39C12" stroke-width="2" stroke-linecap="round"/><line x1="63" y1="40" x2="68" y2="40" stroke="#F39C12" stroke-width="2" stroke-linecap="round"/></svg>'
  },

  // ── Pair 14: Zen / Hijabi ──
  zen: {
    name: 'Zen', pair: 14,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><path d="M30 36 Q33 34 36 36" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M44 36 Q47 34 50 36" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="40" cy="44" r="2.5" fill="#fff"/><circle cx="40" cy="6" r="5" fill="#FFD700" opacity="0.6"/><circle cx="40" cy="6" r="9" fill="none" stroke="#FFD700" stroke-width="1" opacity="0.3"/><circle cx="40" cy="6" r="13" fill="none" stroke="#FFD700" stroke-width="0.8" opacity="0.15"/><path d="M20 68 Q40 58 60 68" stroke="#078A91" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="40" cy="64" r="1.5" fill="#078A91" opacity="0.5"/></svg>'
  },
  hijabi: {
    name: 'Hijabi', pair: 14,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><path d="M14 44 Q14 12 40 10 Q66 12 66 44 Q66 62 40 70 Q14 62 14 44Z" fill="#09B1BA"/><path d="M14 44 Q14 16 40 14 Q66 16 66 44" stroke="#078A91" stroke-width="2" fill="none"/><circle cx="40" cy="40" r="16" fill="#F5D6C3"/><circle cx="35" cy="38" r="2.5" fill="#09B1BA"/><circle cx="45" cy="38" r="2.5" fill="#09B1BA"/><path d="M36 46 Q40 50 44 46" stroke="#09B1BA" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 38 Q24 20 40 18 Q56 20 56 38" fill="#09B1BA"/><path d="M20 42 Q18 52 24 58" stroke="#078A91" stroke-width="1.5" fill="none"/><path d="M60 42 Q62 52 56 58" stroke="#078A91" stroke-width="1.5" fill="none"/></svg>'
  },

  // ── Pair 15: Gamer ──
  gamer: {
    name: 'Gamer', pair: 15,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><circle cx="34" cy="37" r="2.5" fill="#fff"/><circle cx="46" cy="37" r="2.5" fill="#fff"/><path d="M34 46 Q40 51 46 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 30 Q16 24 22 24 L58 24 Q64 24 64 30 L64 36 Q64 42 58 42 L22 42 Q16 42 16 36Z" fill="#078A91" opacity="0.85"/><rect x="18" y="28" width="8" height="10" rx="4" fill="#078A91"/><rect x="54" y="28" width="8" height="10" rx="4" fill="#078A91"/><circle cx="22" cy="33" r="3" fill="#333" opacity="0.6"/><circle cx="58" cy="33" r="3" fill="#333" opacity="0.6"/><line x1="62" y1="28" x2="68" y2="22" stroke="#078A91" stroke-width="2.5" stroke-linecap="round"/><circle cx="70" cy="20" r="3" fill="#078A91"/><rect x="26" y="58" width="28" height="14" rx="5" fill="#078A91"/><circle cx="35" cy="65" r="3" fill="#333" opacity="0.5"/><rect x="43" y="61" width="2" height="6" rx="1" fill="#333" opacity="0.5"/><rect x="41" y="63" width="6" height="2" rx="1" fill="#333" opacity="0.5"/><circle cx="35" cy="65" r="1.2" fill="#09B1BA"/></svg>'
  },
  gamer_girl: {
    name: 'Gamer Girl', pair: 15,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><ellipse cx="34" cy="37" rx="3" ry="3.5" fill="#fff"/><ellipse cx="46" cy="37" rx="3" ry="3.5" fill="#fff"/><circle cx="34" cy="37.5" r="1.5" fill="#09B1BA"/><circle cx="46" cy="37.5" r="1.5" fill="#09B1BA"/><path d="M34 46 Q40 51 46 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 32 Q16 26 22 26 L58 26 Q64 26 64 32 L64 36 Q64 42 58 42 L22 42 Q16 42 16 36Z" fill="#078A91" opacity="0.85"/><rect x="16" y="28" width="10" height="12" rx="5" fill="#078A91"/><rect x="54" y="28" width="10" height="12" rx="5" fill="#078A91"/><circle cx="21" cy="34" r="3.5" fill="#333" opacity="0.5"/><circle cx="59" cy="34" r="3.5" fill="#333" opacity="0.5"/><line x1="64" y1="30" x2="70" y2="24" stroke="#078A91" stroke-width="2.5" stroke-linecap="round"/><circle cx="72" cy="22" r="3" fill="#078A91"/><path d="M22 18 Q28 10 34 16 Q38 12 40 18" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M58 18 Q52 10 46 16 Q42 12 40 18" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><polygon points="12,10 13,6 14,10 13,8" fill="#FFD700" opacity="0.8"/><polygon points="66,8 67.5,4 69,8 67.5,6" fill="#FFD700" opacity="0.8"/><polygon points="54,6 55,2 56,6 55,4" fill="#FFD700" opacity="0.7"/></svg>'
  },

  // ── Pair 16: Pro Gamer / Streamer ──
  pro_gamer: {
    name: 'Pro Gamer', pair: 16,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><rect x="30" y="35" width="8" height="3" rx="1.5" fill="#fff"/><rect x="42" y="35" width="8" height="3" rx="1.5" fill="#fff"/><circle cx="34" cy="36.5" r="1.2" fill="#09B1BA"/><circle cx="46" cy="36.5" r="1.2" fill="#09B1BA"/><path d="M37 46 L43 46" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 32 Q14 24 22 24 L58 24 Q66 24 66 32 L66 36 Q66 44 58 44 L22 44 Q14 44 14 36Z" fill="#078A91" opacity="0.9"/><rect x="16" y="28" width="10" height="12" rx="5" fill="#333"/><rect x="54" y="28" width="10" height="12" rx="5" fill="#333"/><line x1="14" y1="30" x2="66" y2="30" stroke="#E74C3C" stroke-width="1" opacity="0.7"/><line x1="14" y1="33" x2="66" y2="33" stroke="#2ECC71" stroke-width="1" opacity="0.7"/><line x1="14" y1="36" x2="66" y2="36" stroke="#3498DB" stroke-width="1" opacity="0.7"/><rect x="58" y="56" width="16" height="12" rx="2" fill="#078A91"/><rect x="60" y="58" width="12" height="8" rx="1" fill="#333"/><rect x="62" y="60" width="8" height="4" rx="0.5" fill="#09B1BA" opacity="0.6"/><line x1="63" y1="62" x2="67" y2="62" stroke="#2ECC71" stroke-width="0.8" opacity="0.8"/><rect x="62" y="70" width="12" height="2" rx="1" fill="#078A91"/></svg>'
  },
  streamer: {
    name: 'Streamer', pair: 16,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#F0F0F0"/><circle cx="40" cy="40" r="22" fill="#09B1BA"/><ellipse cx="34" cy="37" rx="3" ry="3.5" fill="#fff"/><ellipse cx="46" cy="37" rx="3" ry="3.5" fill="#fff"/><circle cx="34" cy="37.5" r="1.5" fill="#09B1BA"/><circle cx="46" cy="37.5" r="1.5" fill="#09B1BA"/><path d="M33 46 Q40 52 47 46" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="26" cy="42" r="4" fill="#078A91" opacity="0.3"/><circle cx="54" cy="42" r="4" fill="#078A91" opacity="0.3"/><path d="M16 34 Q16 26 22 26 L58 26 Q64 26 64 34 L64 38 Q64 44 58 44 L22 44 Q16 44 16 38Z" fill="#078A91" opacity="0.85"/><rect x="16" y="30" width="10" height="12" rx="5" fill="#078A91"/><rect x="54" y="30" width="10" height="12" rx="5" fill="#078A91"/><circle cx="21" cy="36" r="3.5" fill="#333" opacity="0.5"/><circle cx="59" cy="36" r="3.5" fill="#333" opacity="0.5"/><line x1="16" y1="38" x2="10" y2="46" stroke="#078A91" stroke-width="2.5" stroke-linecap="round"/><circle cx="9" cy="48" r="3.5" fill="#333"/><circle cx="9" cy="48" r="1.5" fill="#078A91"/><path d="M24 18 Q30 10 36 16 Q38 12 40 18" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M56 18 Q50 10 44 16 Q42 12 40 18" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M60 12 C58 10 54 10 54 14 C54 18 60 20 60 20 C60 20 66 18 66 14 C66 10 62 10 60 12Z" fill="#E74C3C" opacity="0.7" transform="scale(0.6) translate(38,-2)"/><path d="M60 12 C58 10 54 10 54 14 C54 18 60 20 60 20 C60 20 66 18 66 14 C66 10 62 10 60 12Z" fill="#E74C3C" opacity="0.6" transform="scale(0.5) translate(20,6)"/></svg>'
  }
};

/**
 * Avatar pairs for modal display — each pair shown side by side
 */
const AVATAR_PAIRS = [
  ['happy', 'happy_girl'],
  ['cool', 'cool_girl'],
  ['star', 'star_girl'],
  ['ninja', 'ninja_girl'],
  ['plantie', 'plantie_girl'],
  ['lovely', 'lovely_girl'],
  ['techie', 'techie_girl'],
  ['royal', 'royal_girl'],
  ['mecano', 'mecano_girl'],
  ['bricoleur', 'bricoleuse'],
  ['kitty', 'chic'],
  ['sporty', 'athlete'],
  ['yogi', 'sunny'],
  ['zen', 'hijabi'],
  ['gamer', 'gamer_girl'],
  ['pro_gamer', 'streamer']
];

/**
 * Get all avatars as [key, {name, svg, pair}] entries
 * @returns {Array}
 */
function getAllAvatars() {
  return Object.entries(SWAPPO_AVATARS);
}

/**
 * Get avatars organized by pairs for modal display
 * @returns {Array} Array of { left: {key, name, svg}, right: {key, name, svg} }
 */
function getAvatarPairs() {
  return AVATAR_PAIRS.map(([leftKey, rightKey]) => ({
    left: { key: leftKey, ...SWAPPO_AVATARS[leftKey] },
    right: { key: rightKey, ...SWAPPO_AVATARS[rightKey] }
  }));
}

/**
 * Get a specific avatar SVG string by key
 * @param {string} key - The avatar key (e.g., 'happy', 'chic')
 * @returns {string|null} The SVG string or null if not found
 */
function getAvatarSVG(key) {
  return SWAPPO_AVATARS[key] ? SWAPPO_AVATARS[key].svg : null;
}

/**
 * Get avatar name by key
 * @param {string} key - The avatar key
 * @returns {string|null} The display name or null
 */
function getAvatarName(key) {
  return SWAPPO_AVATARS[key] ? SWAPPO_AVATARS[key].name : null;
}

/**
 * Get all avatar keys as a flat array
 * @returns {Array} Array of all avatar key strings
 */
function getAllAvatarKeys() {
  return Object.keys(SWAPPO_AVATARS);
}

/**
 * Backward-compatible: get avatars (ignores gender, returns all)
 * @returns {Array} Array of [key, {name, svg}] entries
 */
function getAvatarsByGender() {
  return Object.entries(SWAPPO_AVATARS);
}

// Expose to global scope
window.SWAPPO_AVATARS = SWAPPO_AVATARS;
window.AVATAR_PAIRS = AVATAR_PAIRS;
window.getAllAvatars = getAllAvatars;
window.getAvatarPairs = getAvatarPairs;
window.getAvatarSVG = getAvatarSVG;
window.getAvatarName = getAvatarName;
window.getAllAvatarKeys = getAllAvatarKeys;
window.getAvatarsByGender = getAvatarsByGender;
