/**
 * Hand-drawn SVG fish silhouettes, one per body plan.
 *
 * Every fish faces left in a 200x100 viewBox. Species share a shape when they
 * genuinely share a body plan (a largemouth and a spotted bass really do look
 * alike) and are separated by accent colour and fin detail.
 */

type Shape = {
  /** Main body outline, including the caudal peduncle. */
  body: string;
  /** Tail fin. */
  tail: string;
  /** Dorsal fin(s) along the back. */
  dorsal?: string;
  /** Anal fin under the rear of the body. */
  anal?: string;
  /** Pectoral fin behind the gill. */
  pect?: string;
  /** Any extra distinguishing marks: barbels, stripes, spots. */
  extra?: string;
  /** Eye position. */
  eye: [number, number];
  /** Body fill, from cool water tones to warm. */
  tone: string;
};

const SHAPES: Record<string, Shape> = {
  // Deep-bodied, big-mouthed black bass.
  bass: {
    body: 'M14,50c10-17 30-27 60-27s56,10 74,24l8,3-8,3c-18,14-44,24-74,24s-50-10-60-27z',
    tail: 'M156,50l30-19-6,19 6,19z',
    dorsal: 'M70,25l4-14 10,12 6-13 10,12 8-11 6,15z',
    anal: 'M104,74l6,13 10-11 8,11 2-12z',
    pect: 'M56,56c8,2 14,8 16,15-9-1-16-6-20-13z',
    extra: 'M22,48c22,4 48,5 74,3l-2,5c-26,2-52,1-74-3z',
    eye: [30, 44],
    tone: '#4a6741',
  },
  smallmouth: {
    body: 'M14,50c10-16 30-26 60-26s56,10 74,23l8,3-8,3c-18,13-44,23-74,23s-50-10-60-26z',
    tail: 'M156,50l30-19-6,19 6,19z',
    dorsal: 'M68,26l4-13 10,11 6-12 10,11 8-10 6,14z',
    anal: 'M104,73l6,12 10-10 8,10 2-11z',
    pect: 'M56,55c8,2 14,8 16,15-9-1-16-6-20-13z',
    extra: 'M50,30l3,40M68,28l3,44M86,28l3,44M104,30l3,40',
    eye: [30, 44],
    tone: '#8a6a3a',
  },
  // Round, laterally compressed sunfish.
  panfish: {
    body: 'M16,50c8-21 28-33 56-33s50,12 58,29l6,4-6,4c-8,17-30,29-58,29s-48-12-56-33z',
    tail: 'M136,50l32-18-6,18 6,18z',
    dorsal: 'M60,18l2-11 10,9 8-10 10,9 10-8 8,12z',
    anal: 'M92,82l4,11 10-9 8,9 2-11z',
    pect: 'M58,58c7,3 12,10 13,17-8-2-14-8-17-15z',
    extra: 'M24,42c4-6 10-8 15-7l-1,7z',
    eye: [32, 42],
    tone: '#5b7a4a',
  },
  // Deep, high-backed crappie with a long dorsal.
  crappie: {
    body: 'M16,50c8-20 28-32 56-32s50,12 58,28l6,4-6,4c-8,16-30,28-58,28s-48-12-56-32z',
    tail: 'M134,50l34-19-7,19 7,19z',
    dorsal: 'M56,19l2-12 12,10 10-11 12,10 12-9 8,14z',
    anal: 'M82,82l4,12 12-10 10,10 10-9 4,12z',
    pect: 'M58,58c7,3 12,10 13,17-8-2-14-8-17-15z',
    extra: 'M40,36a4,4 0 1,0 0.1,0M62,32a5,5 0 1,0 0.1,0M86,40a4,4 0 1,0 0.1,0M56,60a5,5 0 1,0 0.1,0M92,64a4,4 0 1,0 0.1,0',
    eye: [32, 42],
    tone: '#6c7f6a',
  },
  // Elongate percid with two separate dorsal fins.
  perch: {
    body: 'M12,50c12-14 32-22 62-22s58,8 76,19l8,3-8,3c-18,11-46,19-76,19s-50-8-62-22z',
    tail: 'M158,50l28-16-6,16 6,16z',
    dorsal: 'M58,30l2-16 12,4 12,3 10,4zM96,28l4-11 14,6 12,6z',
    anal: 'M108,71l6,12 12-9 6,9 2-11z',
    pect: 'M56,55c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M42,32l4,36M60,30l4,40M78,29l4,42M96,30l4,40M114,33l3,36',
    eye: [28, 45],
    tone: '#b08b3e',
  },
  walleye: {
    body: 'M10,50c12-13 34-21 66-21s60,8 78,18l8,3-8,3c-18,10-46,18-78,18s-54-8-66-21z',
    tail: 'M162,50l26-16-6,16 6,16z',
    dorsal: 'M56,31l2-16 12,4 14,3 10,4zM98,29l4-11 14,6 12,6z',
    anal: 'M110,71l6,12 12-9 6,9 2-11z',
    pect: 'M56,55c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M188,50l-6,16 12-6z',
    eye: [26, 45],
    tone: '#a08a4a',
  },
  // Long, cylindrical ambush predators with a rear-set dorsal.
  pike: {
    body: 'M6,50c14-9 34-14 66-14s64,5 88,12l14,2-14,2c-24,7-56,12-88,12s-52-5-66-14z',
    tail: 'M170,50l24-15-5,15 5,15z',
    dorsal: 'M118,38l4-15 14,5 12,7z',
    anal: 'M118,62l4,15 14-5 12-7z',
    pect: 'M56,56c8,2 13,7 15,13-8-1-14-5-18-11z',
    extra: 'M34,44a4,3 0 1,0 0.1,0M52,54a4,3 0 1,0 0.1,0M72,42a4,3 0 1,0 0.1,0M90,56a4,3 0 1,0 0.1,0M108,44a4,3 0 1,0 0.1,0M126,54a4,3 0 1,0 0.1,0',
    eye: [26, 45],
    tone: '#4c6b46',
  },
  musky: {
    body: 'M6,50c14-9 34-14 66-14s64,5 88,12l14,2-14,2c-24,7-56,12-88,12s-52-5-66-14z',
    tail: 'M170,50l26-17-8,17 8,17z',
    dorsal: 'M118,38l4-15 14,5 12,7z',
    anal: 'M118,62l4,15 14-5 12-7z',
    pect: 'M56,56c8,2 13,7 15,13-8-1-14-5-18-11z',
    extra: 'M40,38l3,24M58,36l3,28M76,36l3,28M94,37l3,26M112,39l3,22M130,41l3,18',
    eye: [26, 45],
    tone: '#5a6a4c',
  },
  snakehead: {
    body: 'M6,50c16-8 36-12 68-12s62,4 86,10l14,2-14,2c-24,6-54,10-86,10s-52-4-68-12z',
    tail: 'M174,50l22-13-4,13 4,13z',
    dorsal: 'M42,38c26-4 74-4 110,0l-2-9c-36-3-84-3-108,0z',
    anal: 'M52,62c24,4 66,4 98,0l-2,8c-32,3-72,3-96,0z',
    pect: 'M52,56c8,2 13,7 15,12-8-1-14-4-18-10z',
    extra: 'M30,44a7,5 0 1,0 0.1,0M56,52a7,5 0 1,0 0.1,0M84,44a7,5 0 1,0 0.1,0M112,52a7,5 0 1,0 0.1,0M140,46a7,5 0 1,0 0.1,0',
    eye: [22, 45],
    tone: '#6b6a4a',
  },
  // Streamlined temperate bass, silver with horizontal stripes.
  striper: {
    body: 'M12,50c12-15 32-24 62-24s58,9 76,20l8,4-8,4c-18,11-46,20-76,20s-50-9-62-24z',
    tail: 'M158,50l28-18-7,18 7,18z',
    dorsal: 'M60,28l2-14 12,5 12,4 8,4zM98,27l4-11 14,6 12,6z',
    anal: 'M108,72l6,12 12-9 6,9 2-11z',
    pect: 'M56,56c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M24,42c30-3 76-3 118,1M24,48c30-3 76-3 118,1M24,54c30-3 76-3 118,1M26,60c30-3 72-3 112,1',
    eye: [28, 44],
    tone: '#7d8b96',
  },
  shad: {
    body: 'M14,50c10-19 30-30 56-30s50,11 60,26l8,4-8,4c-10,15-34,26-60,26s-46-11-56-30z',
    tail: 'M134,50l34-21-8,21 8,21z',
    dorsal: 'M74,20l4-11 12,7 10,7z',
    anal: 'M84,80c14,3 26,2 34-2l2,9c-12,3-24,2-34-1z',
    pect: 'M56,58c7,3 12,9 13,15-8-2-14-7-17-13z',
    extra: 'M40,32a5,4 0 1,0 0.1,0M58,28a4,3 0 1,0 0.1,0M76,30a4,3 0 1,0 0.1,0',
    eye: [30, 42],
    tone: '#8f9aa4',
  },
  // Salmonids: soft-rayed, with the tell-tale adipose fin.
  trout: {
    body: 'M10,50c12-15 34-23 66-23s60,9 78,19l10,4-10,4c-18,10-46,19-78,19s-54-8-66-23z',
    tail: 'M164,50l26-16-6,16 6,16z',
    dorsal: 'M66,27l4-13 16,6 12,7z',
    anal: 'M104,73l6,13 14-7 6,7 2-13z',
    pect: 'M56,58c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M132,36l6-8 6,8zM40,38a4,4 0 1,0 0.1,0M62,34a4,4 0 1,0 0.1,0M84,40a4,4 0 1,0 0.1,0M106,36a4,4 0 1,0 0.1,0M52,60a4,4 0 1,0 0.1,0M92,62a4,4 0 1,0 0.1,0',
    eye: [26, 44],
    tone: '#7a8a5c',
  },
  char: {
    body: 'M10,50c12-15 34-23 66-23s60,9 78,19l10,4-10,4c-18,10-46,19-78,19s-54-8-66-23z',
    tail: 'M164,50l28-18-9,18 9,18z',
    dorsal: 'M66,27l4-13 16,6 12,7z',
    anal: 'M104,73l6,13 14-7 6,7 2-13z',
    pect: 'M56,58c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M132,36l6-8 6,8zM44,42a5,5 0 1,0 0.1,0M70,38a5,5 0 1,0 0.1,0M96,44a5,5 0 1,0 0.1,0M58,60a5,5 0 1,0 0.1,0M84,62a5,5 0 1,0 0.1,0',
    eye: [26, 44],
    tone: '#5d7285',
  },
  salmon: {
    body: 'M8,54c6-9 16-16 30-20 16-5 34-7 52-7 26,0 48,8 64,18l10,5-10,5c-16,10-38,18-64,18-22,0-44-6-60-14z',
    tail: 'M164,55l28-18-9,18 9,18z',
    dorsal: 'M66,29l4-13 16,6 12,7z',
    anal: 'M104,76l6,13 14-7 6,7 2-13z',
    pect: 'M56,62c8,2 14,8 16,14-9-1-16-5-20-12z',
    extra: 'M132,40l6-8 6,8zM8,54c-4-4-4-8 2-9l6,3zM46,40a4,4 0 1,0 0.1,0M70,36a4,4 0 1,0 0.1,0M94,42a4,4 0 1,0 0.1,0',
    eye: [26, 47],
    tone: '#8a5f5a',
  },
  whitefish: {
    body: 'M14,52c10-15 32-24 62-24s58,9 76,19l10,3-10,3c-18,10-46,19-76,19s-52-9-62-20z',
    tail: 'M162,53l28-18-8,18 8,18z',
    dorsal: 'M70,29l4-12 14,5 12,7z',
    anal: 'M106,74l6,12 12-7 6,7 2-12z',
    pect: 'M58,60c8,2 13,7 15,13-8-1-15-5-19-11z',
    extra: 'M134,38l6-7 6,7zM14,52c-3-4-1-8 5-8l4,5z',
    eye: [30, 46],
    tone: '#93a0a8',
  },
  grayling: {
    body: 'M12,52c12-14 32-22 62-22s58,8 76,18l10,4-10,4c-18,10-46,18-76,18s-50-8-62-22z',
    tail: 'M160,52l28-17-7,17 7,17z',
    dorsal: 'M52,30c26-14 46-16 60-13l-2,20c-16-4-38-4-58-1z',
    anal: 'M104,74l6,12 12-7 6,7 2-12z',
    pect: 'M56,60c8,2 14,7 16,13-9-1-16-5-20-11z',
    extra: 'M132,38l5-7 5,7z',
    eye: [28, 46],
    tone: '#6b7f9a',
  },
  // Catfish: barbels, adipose fin, no scales.
  catfish: {
    body: 'M8,52c14-13 34-20 66-20s60,7 80,17l10,3-10,3c-20,10-48,17-80,17s-52-7-66-20z',
    tail: 'M164,52l28-18-8,18 8,18z',
    dorsal: 'M60,32l3-16 14,7 10,8z',
    anal: 'M92,72c22,4 38,3 48-1l2,12c-14,4-34,4-52,0z',
    pect: 'M54,62c9,3 15,9 17,16-10-2-17-7-21-14z',
    extra: 'M14,44c-6-10-12-16-18-17M14,46c-8-6-16-9-24-9M16,58c-7,5-14,8-22,8M18,60c-5,8-9,13-15,16M132,38l6-8 6,8z',
    eye: [28, 46],
    tone: '#6f6350',
  },
  bullhead: {
    body: 'M10,52c14-12 32-18 60-18s54,6 72,15l10,3-10,3c-18,9-44,15-72,15s-46-6-60-18z',
    tail: 'M152,52l30-13-4,13 4,13z',
    dorsal: 'M58,34l3-15 13,7 10,7z',
    anal: 'M88,71c20,4 34,3 44-1l2,11c-13,4-31,4-48,0z',
    pect: 'M54,61c9,3 14,9 16,15-10-2-16-7-20-13z',
    extra: 'M14,45c-6-9-12-14-18-15M15,47c-8-5-15-8-23-8M16,58c-7,5-13,7-21,7M18,60c-5,7-9,12-14,14M126,40l6-7 6,7z',
    eye: [28, 47],
    tone: '#5a4f42',
  },
  burbot: {
    body: 'M6,52c16-8 38-12 70-12s66,4 92,9l16,3-16,3c-26,5-60,9-92,9s-54-4-70-12z',
    tail: 'M180,52l16-11-3,11 3,11z',
    dorsal: 'M40,40c30-4 82-4 122,0l-2-8c-38-3-88-3-118,0z',
    anal: 'M60,64c28,3 70,3 100,0l-2,7c-30,3-68,3-96,0z',
    pect: 'M50,58c8,2 12,6 14,11-8-1-13-4-17-9z',
    extra: 'M14,58c-2,7-5,11-10,12M28,44a6,4 0 1,0 0.1,0M56,50a6,4 0 1,0 0.1,0M84,44a6,4 0 1,0 0.1,0M112,50a6,4 0 1,0 0.1,0M140,46a6,4 0 1,0 0.1,0',
    eye: [22, 47],
    tone: '#7a6a4e',
  },
  // Heavy-bodied cyprinids and suckers.
  carp: {
    body: 'M14,52c10-19 32-30 60-30s54,11 66,27l8,3-8,3c-12,16-38,27-66,27s-50-11-60-30z',
    tail: 'M148,52l32-19-8,19 8,19z',
    dorsal: 'M52,23c30-6 60-4 76,3l-2,12c-20-7-48-9-76-4z',
    anal: 'M96,80l6,12 12-8 6,8 2-12z',
    pect: 'M58,60c8,3 13,9 15,15-9-2-16-7-19-13z',
    extra: 'M16,46c-6-3-11-3-15,0M16,58c-6,3-11,4-15,2M34,36c14,10 34,16 56,18M34,66c14-8 34-13 56-15',
    eye: [30, 44],
    tone: '#9a7f4a',
  },
  buffalo: {
    body: 'M14,54c8-24 30-38 58-38s52,14 62,33l8,3-8,3c-10,17-34,29-62,29s-50-11-58-30z',
    tail: 'M146,55l32-20-8,20 8,20z',
    dorsal: 'M50,20c28-6 58-4 74,3l-2,14c-20-8-46-11-74-6z',
    anal: 'M94,82l6,12 12-8 6,8 2-12z',
    pect: 'M58,62c8,3 13,9 15,15-9-2-16-7-19-13z',
    extra: 'M16,56c-6,2-10,5-12,9l8,1z',
    eye: [30, 44],
    tone: '#7d7256',
  },
  drum: {
    body: 'M14,54c8-23 30-36 58-36s52,13 64,31l8,4-8,4c-12,16-36,27-64,27s-50-11-58-30z',
    tail: 'M152,57l28-14-6,14 6,14z',
    dorsal: 'M48,22c28-6 56-4 72,3l-2,7c-22-6-46-8-70-4zM76,32c22-2 40,0 50,5l-2,8c-14-6-30-9-48-8z',
    anal: 'M96,82l6,12 12-8 6,8 2-12z',
    pect: 'M58,62c8,3 13,9 15,15-9-2-16-7-19-13z',
    extra: 'M22,46c26-3 62-2 94,3',
    eye: [30, 44],
    tone: '#8d8f88',
  },
  bowfin: {
    body: 'M8,52c14-10 36-15 68-15s64,5 88,11l14,2-14,2c-24,6-56,11-88,11s-54-5-68-11z',
    tail: 'M172,52l22-12-4,12 4,12z',
    dorsal: 'M38,38c30-5 84-5 122,0l-2-10c-38-4-88-4-118,0z',
    anal: 'M96,64c22,3 44,3 60,0l-2,8c-18,3-38,3-56,0z',
    pect: 'M52,58c8,2 13,7 15,12-8-1-14-4-18-10z',
    extra: 'M170,44a7,7 0 1,0 0.1,0M22,44c22,4 52,6 82,5',
    eye: [24, 47],
    tone: '#5f6b4e',
  },
  knifefish: {
    body: 'M18,50c14-16 40-24 70-24s58,10 76,22l12,2-12,2c-18,12-46,22-76,22s-56-8-70-24z',
    tail: 'M176,52l16-8-3,8 3,8z',
    dorsal: 'M74,26l4-8 14,4 12,5z',
    anal: 'M44,66c34,10 84,12 122,4l2,8c-40,8-92,6-128-4z',
    pect: 'M60,56c8,2 13,7 15,12-8-1-14-4-18-10z',
    extra: 'M70,42a5,5 0 1,0 0.1,0M92,44a5,5 0 1,0 0.1,0M114,44a5,5 0 1,0 0.1,0M136,46a5,5 0 1,0 0.1,0',
    eye: [32, 44],
    tone: '#6a6b74',
  },
  // Armoured and ancient body plans.
  gar: {
    body: 'M56,50c16-8 40-12 70-12s52,4 62,9l12,3-12,3c-10,5-32,9-62,9s-54-4-70-12z',
    tail: 'M186,50l12-13-2,13 2,13z',
    dorsal: 'M148,38l4-13 14,5 10,7z',
    anal: 'M148,62l4,13 14-5 10-7z',
    pect: 'M92,56c8,2 13,7 15,12-8-1-14-4-18-10z',
    extra: 'M56,50L2,44l0,4 52,4M2,44c0-2 2-3 6-3M4,52c0,2 2,3 6,3M74,40a4,4 0 1,0 0.1,0M100,42a4,4 0 1,0 0.1,0M126,42a4,4 0 1,0 0.1,0M152,44a4,4 0 1,0 0.1,0',
    eye: [62, 45],
    tone: '#6d6a45',
  },
  sturgeon: {
    body: 'M30,54c18-10 44-14 74-14s54,4 64,9l14,3-14,3c-10,5-34,9-64,9s-56-4-74-10z',
    tail: 'M182,56l16-24-4,24 8,10z',
    dorsal: 'M144,42l4-13 14,5 10,8z',
    anal: 'M144,66l4,12 14-5 10-7z',
    pect: 'M78,62c10,3 16,9 18,15-11-2-18-7-22-13z',
    extra: 'M30,54L4,48c-2-1-2-3 0-4l26,4M14,58c-4,2-8,3-12,2M18,60c-4,3-7,5-11,5M40,44a4,4 0 1,0 0.1,0M66,42a4,4 0 1,0 0.1,0M92,42a4,4 0 1,0 0.1,0M118,44a4,4 0 1,0 0.1,0',
    eye: [38, 50],
    tone: '#7c8378',
  },
  paddlefish: {
    body: 'M62,52c16-12 42-18 72-18s52,6 60,12l14,4-14,4c-8,6-30,12-60,12s-56-6-72-14z',
    tail: 'M190,54l10-22-2,22 6,12z',
    dorsal: 'M148,38l4-14 14,6 10,8z',
    anal: 'M148,68l4,12 14-5 10-7z',
    pect: 'M104,64c10,3 16,9 18,15-11-2-18-7-22-13z',
    extra: 'M62,52C40,42 16,36 2,36c-2,0-2,4 0,5 16,4 38,10 60,16z',
    eye: [70, 48],
    tone: '#7d8890',
  },
  // Introduced cichlids.
  tilapia: {
    body: 'M16,50c10-20 30-31 56-31s50,11 60,27l8,4-8,4c-10,16-34,27-60,27s-46-11-56-31z',
    tail: 'M136,50l32-17-6,17 6,17z',
    dorsal: 'M52,20c30-6 58-3 72,5l-2,10c-20-8-44-11-70-6z',
    anal: 'M92,80c16,3 28,2 36-2l2,10c-12,4-26,4-38,1z',
    pect: 'M58,58c7,3 12,9 13,15-8-2-14-7-17-13z',
    extra: 'M40,30l3,40M60,26l3,46M80,28l3,44M100,32l3,38',
    eye: [32, 42],
    tone: '#5f7a86',
  },
  peacock: {
    body: 'M14,50c10-18 30-28 60-28s56,10 74,25l8,3-8,3c-18,15-44,25-74,25s-50-10-60-28z',
    tail: 'M156,50l30-18-6,18 6,18z',
    dorsal: 'M56,22c34-6 66-2 84,7l-2,10c-24-10-54-13-84-8z',
    anal: 'M100,76c18,3 32,2 42-3l2,11c-14,5-30,5-46,1z',
    pect: 'M56,56c8,2 14,8 16,15-9-1-16-6-20-13z',
    extra: 'M50,26l4,44M74,24l4,48M98,28l4,42M168,50a8,8 0 1,0 0.1,0',
    eye: [30, 42],
    tone: '#8a7f3e',
  },
};

/** Maps an illustration key from the database onto a drawn body plan. */
const KEY_TO_SHAPE: Record<string, keyof typeof SHAPES> = {
  bass: 'bass',
  smallmouth: 'smallmouth',
  sunfish: 'panfish',
  crappie: 'crappie',
  perch: 'perch',
  walleye: 'walleye',
  pike: 'pike',
  musky: 'musky',
  snakehead: 'snakehead',
  striper: 'striper',
  shad: 'shad',
  trout: 'trout',
  char: 'char',
  salmon: 'salmon',
  whitefish: 'whitefish',
  grayling: 'grayling',
  catfish: 'catfish',
  bullhead: 'bullhead',
  burbot: 'burbot',
  carp: 'carp',
  buffalo: 'buffalo',
  drum: 'drum',
  bowfin: 'bowfin',
  knifefish: 'knifefish',
  gar: 'gar',
  sturgeon: 'sturgeon',
  paddlefish: 'paddlefish',
  tilapia: 'tilapia',
  peacock: 'peacock',
};

type Props = {
  /** The `illustration` column from fish_species. */
  illustration: string | null | undefined;
  /** Rendered width in pixels; height follows the 2:1 viewBox. */
  size?: number;
  className?: string;
};

export function FishIllustration({ illustration, size = 120, className }: Props) {
  const shape = SHAPES[KEY_TO_SHAPE[illustration ?? ''] ?? 'bass'];

  return (
    <svg
      viewBox="0 0 200 100"
      width={size}
      height={size / 2}
      className={className}
      role="img"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <g fill={shape.tone}>
        {shape.tail && <path d={shape.tail} opacity="0.75" />}
        {shape.dorsal && <path d={shape.dorsal} opacity="0.75" />}
        {shape.anal && <path d={shape.anal} opacity="0.75" />}
        <path d={shape.body} />
        {shape.pect && <path d={shape.pect} opacity="0.3" fill="#000" />}
        {shape.extra && (
          <path
            d={shape.extra}
            fill="none"
            stroke="rgba(0,0,0,0.28)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
        <circle cx={shape.eye[0]} cy={shape.eye[1]} r="4.5" fill="#f7f3e8" />
        <circle cx={shape.eye[0]} cy={shape.eye[1]} r="2.4" fill="#22201b" />
      </g>
    </svg>
  );
}
