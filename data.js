// Static data: exercise library, workout templates, food list, coach content.
// Weights are kg. For dumbbell exercises "start" is per dumbbell.

const PROFILE_DEFAULT = {
  name: 'Jonathan',
  heightCm: 166,
  startWeight: 63.7,
  startDate: '2026-10-12',
  goalWeight: 60,
  goalDate: '2026-12-31',
  goalBf: 10,
};

const TARGETS_DEFAULT = { kcal: 1850, protein: 135, carbs: 205, fat: 55 };

// type: 'weight' (kg x reps), 'bw' (bodyweight reps, optional added kg), 'time' (seconds)
const EXERCISES = [
  // Chest
  { id: 'bench', name: 'Barbell Bench Press', group: 'Chest', equip: 'Barbell', inc: 2.5, start: 47.5, cue: 'Shoulder blades squeezed back and down, feet planted. Lower to mid-chest under control, press up and slightly back.' },
  { id: 'incline_db', name: 'Incline Dumbbell Press', group: 'Chest', equip: 'Dumbbells', inc: 2, start: 14, cue: 'Bench at 30°. Elbows ~45° from body. Deep stretch at the bottom, don\'t clank the dumbbells.' },
  { id: 'machine_chest', name: 'Machine Chest Press', group: 'Chest', equip: 'Machine', inc: 5, start: 35, cue: 'Seat so handles are at mid-chest. Slow 3-second lowering.' },
  { id: 'cable_fly', name: 'Cable Fly (mid)', group: 'Chest', equip: 'Cable', inc: 2.5, start: 10, cue: 'Slight elbow bend, hug a big tree. Squeeze 1 sec when hands meet.' },
  { id: 'pec_deck', name: 'Pec Deck', group: 'Chest', equip: 'Machine', inc: 5, start: 30, cue: 'Chest up, elbows soft. Control the stretch.' },
  { id: 'pushup', name: 'Push-ups', group: 'Chest', equip: 'Bodyweight', type: 'bw', cue: 'Body in a straight line — squeeze glutes so your lower back doesn\'t sag.' },
  // Back
  { id: 'lat_pulldown', name: 'Lat Pulldown', group: 'Back', equip: 'Cable', inc: 5, start: 45, cue: 'Lean back slightly, pull elbows down to your ribs. No swinging.' },
  { id: 'seated_row', name: 'Seated Cable Row', group: 'Back', equip: 'Cable', inc: 5, start: 40, cue: 'Tall chest, pull handle to belly button. Don\'t round or rock your lower back.' },
  { id: 'cs_row', name: 'Chest-Supported DB Row', group: 'Back', equip: 'Dumbbells', inc: 2, start: 14, cue: 'Lie chest-down on a 30° bench — zero lower-back load. Drive elbows back.' },
  { id: 'assisted_pullup', name: 'Assisted Pull-up (machine)', group: 'Back', equip: 'Machine', inc: 5, start: 30, cue: 'Weight = assistance; LESS is harder. Full hang to chin over bar.' },
  { id: 'machine_row', name: 'Machine Row', group: 'Back', equip: 'Machine', inc: 5, start: 40, cue: 'Chest on pad, squeeze shoulder blades together at the end.' },
  // Shoulders
  { id: 'db_shoulder', name: 'Seated DB Shoulder Press', group: 'Shoulders', equip: 'Dumbbells', inc: 2, start: 12, cue: 'Back fully supported on an upright bench. Don\'t arch — ribs down.' },
  { id: 'machine_shoulder', name: 'Machine Shoulder Press', group: 'Shoulders', equip: 'Machine', inc: 5, start: 25, cue: 'Back against pad, press straight up, control down to chin height.' },
  { id: 'lateral_raise', name: 'DB Lateral Raise', group: 'Shoulders', equip: 'Dumbbells', inc: 1, start: 6, cue: 'Lead with elbows, raise to shoulder height, slight forward lean. Light weight, strict form — this builds the "capped" shoulder look.' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise', group: 'Shoulders', equip: 'Cable', inc: 1.25, start: 5, cue: 'Cable from low pulley behind you. Smooth, no shrugging.' },
  { id: 'rear_delt', name: 'Reverse Pec Deck (rear delts)', group: 'Shoulders', equip: 'Machine', inc: 5, start: 20, cue: 'Arms long, sweep back. Great for posture after desk days.' },
  { id: 'face_pull', name: 'Cable Face Pull', group: 'Shoulders', equip: 'Cable', inc: 2.5, start: 15, cue: 'Rope to forehead, elbows high, pull the rope apart.' },
  // Arms
  { id: 'db_curl', name: 'Dumbbell Curl', group: 'Arms', equip: 'Dumbbells', inc: 1, start: 10, cue: 'Elbows pinned to your sides. Squeeze at the top, 2-3 sec lowering.' },
  { id: 'incline_curl', name: 'Incline DB Curl', group: 'Arms', equip: 'Dumbbells', inc: 1, start: 7, cue: 'Bench at 45°, arms hang behind you — big stretch on the biceps.' },
  { id: 'hammer_curl', name: 'Hammer Curl', group: 'Arms', equip: 'Dumbbells', inc: 1, start: 10, cue: 'Thumbs up grip. Builds arm thickness.' },
  { id: 'cable_curl', name: 'Cable Curl (bar)', group: 'Arms', equip: 'Cable', inc: 2.5, start: 20, cue: 'Constant tension. No body swing.' },
  { id: 'pushdown', name: 'Triceps Rope Pushdown', group: 'Arms', equip: 'Cable', inc: 2.5, start: 20, cue: 'Elbows locked at your sides, spread the rope at the bottom.' },
  { id: 'oh_triceps', name: 'Overhead Cable Triceps Ext.', group: 'Arms', equip: 'Cable', inc: 2.5, start: 15, cue: 'Face away from the cable, ribs down (don\'t arch). Big stretch overhead.' },
  // Legs & glutes
  { id: 'hip_thrust', name: 'Hip Thrust (barbell/machine)', group: 'Glutes & Legs', equip: 'Barbell', inc: 5, start: 40, cue: 'Chin tucked, ribs down. Drive through heels, squeeze glutes hard at top for 1 sec. Movement comes from hips, NOT arching your lower back.' },
  { id: 'leg_press', name: 'Leg Press', group: 'Glutes & Legs', equip: 'Machine', inc: 10, start: 80, cue: 'Feet high & wide on the platform for more glutes. Keep your lower back glued to the pad — stop before your hips curl up.' },
  { id: 'bss', name: 'Bulgarian Split Squat', group: 'Glutes & Legs', equip: 'Dumbbells', inc: 2, start: 6, cue: 'Back foot on bench, lean torso slightly forward for glutes. Reps are per leg.' },
  { id: 'goblet_squat', name: 'Goblet Squat (to box)', group: 'Glutes & Legs', equip: 'Dumbbells', inc: 2, start: 14, cue: 'Hold DB at chest, sit back to a box/bench, stand tall. Front-loaded = easy on the lower back. This is how we safely build up your squat.' },
  { id: 'lunge', name: 'DB Walking Lunge', group: 'Glutes & Legs', equip: 'Dumbbells', inc: 2, start: 8, cue: 'Long steps, torso upright. Reps are per leg.' },
  { id: 'leg_curl', name: 'Seated Leg Curl', group: 'Glutes & Legs', equip: 'Machine', inc: 5, start: 30, cue: 'Pad just above ankles, slow on the way back up.' },
  { id: 'leg_ext', name: 'Leg Extension', group: 'Glutes & Legs', equip: 'Machine', inc: 5, start: 30, cue: 'Pause 1 sec at the top.' },
  { id: 'abduction', name: 'Hip Abduction Machine', group: 'Glutes & Legs', equip: 'Machine', inc: 5, start: 40, cue: 'Lean forward slightly to hit upper glutes — this shapes the butt.' },
  { id: 'pull_through', name: 'Cable Pull-through', group: 'Glutes & Legs', equip: 'Cable', inc: 2.5, start: 20, cue: 'Hinge at hips with soft knees, flat back; snap hips forward and squeeze glutes. Teaches the hinge safely.' },
  { id: 'back_ext', name: '45° Back Extension (glute bias)', group: 'Glutes & Legs', equip: 'Bodyweight', type: 'bw', cue: 'Round upper back slightly, toes out, squeeze glutes to lift. Builds a resilient lower back + glutes. Start bodyweight.' },
  { id: 'calf_raise', name: 'Calf Raise (leg press)', group: 'Glutes & Legs', equip: 'Machine', inc: 10, start: 60, cue: 'Full stretch at the bottom, pause at top.' },
  { id: 'kb_rdl', name: 'Dumbbell RDL (light)', group: 'Glutes & Legs', equip: 'Dumbbells', inc: 2, start: 12, cue: 'Only once your back feels good. Push hips back, flat back, stop when hamstrings are stretched.' },
  // Core
  { id: 'dead_bug', name: 'Dead Bug', group: 'Core', equip: 'Bodyweight', type: 'bw', cue: 'Lower back pressed into the floor the whole time. Slow. Reps per side.' },
  { id: 'bird_dog', name: 'Bird Dog', group: 'Core', equip: 'Bodyweight', type: 'bw', cue: 'Reach long, hold 5-10 sec each rep. Back stays flat like a table.' },
  { id: 'side_plank', name: 'Side Plank', group: 'Core', equip: 'Bodyweight', type: 'time', cue: 'Straight line head to feet. Seconds per side.' },
  { id: 'plank', name: 'Plank (RKC, squeeze)', group: 'Core', equip: 'Bodyweight', type: 'time', cue: 'Squeeze glutes and quads, pull elbows to toes. 20-30 sec of maximal tension.' },
  { id: 'pallof', name: 'Pallof Press', group: 'Core', equip: 'Cable', inc: 2.5, start: 10, cue: 'Stand side-on to cable, press out and resist rotation. Reps per side.' },
  { id: 'cable_crunch', name: 'Cable Crunch', group: 'Core', equip: 'Cable', inc: 2.5, start: 25, cue: 'Kneel, rope by your head, curl ribs to pelvis. Your hips stay still — the 6-pack builder.' },
  { id: 'knee_raise', name: 'Hanging Knee Raise', group: 'Core', equip: 'Bodyweight', type: 'bw', cue: 'Curl pelvis up, don\'t just lift legs. No swinging. Use captain\'s chair if grip fails.' },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout (kneeling)', group: 'Core', equip: 'Bodyweight', type: 'bw', cue: 'Advanced: only go as far as you can WITHOUT your lower back sagging.' },
  // Cardio
  { id: 'incline_walk', name: 'Incline Treadmill Walk', group: 'Cardio', equip: 'Machine', type: 'time', cue: 'Low-impact fat burner. e.g. 10% incline, 5 km/h. Enter seconds (600 = 10 min).' },
];

// Back-friendly Upper/Lower split. reps = [low, high]; rest in seconds.
const TEMPLATES = [
  {
    id: 'UA', name: 'Upper A', focus: 'Chest & Shoulders',
    exercises: [
      { ex: 'bench', sets: 3, reps: [6, 10], rest: 150 },
      { ex: 'incline_db', sets: 3, reps: [8, 12], rest: 120 },
      { ex: 'seated_row', sets: 3, reps: [10, 12], rest: 90 },
      { ex: 'db_shoulder', sets: 3, reps: [8, 12], rest: 90 },
      { ex: 'lateral_raise', sets: 3, reps: [12, 20], rest: 60 },
      { ex: 'pushdown', sets: 2, reps: [10, 15], rest: 60 },
      { ex: 'cable_crunch', sets: 3, reps: [10, 15], rest: 60 },
    ],
  },
  {
    id: 'LA', name: 'Lower A', focus: 'Glutes & Core',
    exercises: [
      { ex: 'hip_thrust', sets: 3, reps: [8, 12], rest: 120 },
      { ex: 'leg_press', sets: 3, reps: [10, 15], rest: 120 },
      { ex: 'bss', sets: 2, reps: [8, 12], rest: 90 },
      { ex: 'leg_curl', sets: 3, reps: [10, 15], rest: 75 },
      { ex: 'abduction', sets: 2, reps: [15, 20], rest: 60 },
      { ex: 'dead_bug', sets: 2, reps: [8, 10], rest: 45 },
      { ex: 'pallof', sets: 2, reps: [10, 12], rest: 45 },
    ],
  },
  {
    id: 'UB', name: 'Upper B', focus: 'Back, Arms & Delts',
    exercises: [
      { ex: 'lat_pulldown', sets: 3, reps: [8, 12], rest: 120 },
      { ex: 'machine_chest', sets: 3, reps: [8, 12], rest: 90 },
      { ex: 'cs_row', sets: 3, reps: [10, 12], rest: 90 },
      { ex: 'cable_lateral', sets: 3, reps: [12, 20], rest: 60 },
      { ex: 'rear_delt', sets: 2, reps: [12, 20], rest: 60 },
      { ex: 'db_curl', sets: 3, reps: [10, 12], rest: 60 },
      { ex: 'oh_triceps', sets: 2, reps: [10, 15], rest: 60 },
      { ex: 'knee_raise', sets: 3, reps: [10, 15], rest: 60 },
    ],
  },
  {
    id: 'LB', name: 'Lower B', focus: 'Legs, Glutes & Abs',
    exercises: [
      { ex: 'goblet_squat', sets: 3, reps: [8, 12], rest: 120 },
      { ex: 'pull_through', sets: 3, reps: [12, 15], rest: 90 },
      { ex: 'lunge', sets: 2, reps: [10, 12], rest: 90 },
      { ex: 'leg_ext', sets: 2, reps: [12, 15], rest: 60 },
      { ex: 'back_ext', sets: 2, reps: [12, 15], rest: 60 },
      { ex: 'hammer_curl', sets: 2, reps: [10, 12], rest: 60 },
      { ex: 'cable_crunch', sets: 3, reps: [10, 15], rest: 60 },
      { ex: 'side_plank', sets: 2, reps: [30, 45], rest: 30 },
    ],
  },
];

const WARMUP = [
  'Bike or cross-trainer — 3 min easy',
  'McGill curl-up — 5 reps × 10 sec hold',
  'Bird dog — 5 per side, 10 sec hold',
  'Side plank — 15 sec per side',
  'Hip flexor stretch — 30 sec per side (undoes desk sitting)',
  'First exercise: 2 light warm-up sets before working sets',
];

// Food values are realistic estimates (HPB / typical portions). kcal, p=protein, c=carbs, f=fat (g).
const FOOD_CATS = ['Hawker', 'HeyBo & Bowls', 'Delivery', 'Meal Prep', 'Breakfast', 'Snacks & Protein', 'Drinks'];

const FOODS = [
  // Hawker
  { id: 'chx_rice', cat: 'Hawker', name: 'Chicken rice (steamed)', portion: '1 plate', kcal: 610, p: 26, c: 75, f: 22 },
  { id: 'chx_rice_lean', cat: 'Hawker', name: 'Chicken rice — plain rice, no skin, extra meat', portion: '1 plate', kcal: 480, p: 35, c: 62, f: 9, tip: true },
  { id: 'roast_chx_rice', cat: 'Hawker', name: 'Roast chicken rice', portion: '1 plate', kcal: 650, p: 28, c: 75, f: 26 },
  { id: 'cai_fan_2v1m', cat: 'Hawker', name: 'Economic rice: 2 veg + 1 meat', portion: '1 plate', kcal: 620, p: 25, c: 80, f: 22 },
  { id: 'cai_fan_lean', cat: 'Hawker', name: 'Economic rice: 2 veg + 2 lean meat, ½ rice', portion: '1 plate', kcal: 500, p: 38, c: 45, f: 18, tip: true },
  { id: 'fish_soup', cat: 'Hawker', name: 'Sliced fish soup (no milk) + rice', portion: '1 set', kcal: 420, p: 30, c: 58, f: 6, tip: true },
  { id: 'fish_soup_bh', cat: 'Hawker', name: 'Sliced fish bee hoon soup', portion: '1 bowl', kcal: 360, p: 27, c: 50, f: 5, tip: true },
  { id: 'ytf_soup', cat: 'Hawker', name: 'Yong tau foo soup, 7 pcs, no noodles', portion: '1 bowl', kcal: 320, p: 22, c: 25, f: 14 },
  { id: 'ytf_bh', cat: 'Hawker', name: 'Yong tau foo soup, 7 pcs + bee hoon', portion: '1 bowl', kcal: 480, p: 23, c: 62, f: 14 },
  { id: 'fishball_noodle', cat: 'Hawker', name: 'Fishball noodles (soup)', portion: '1 bowl', kcal: 380, p: 18, c: 58, f: 7 },
  { id: 'bcm', cat: 'Hawker', name: 'Bak chor mee (dry)', portion: '1 bowl', kcal: 510, p: 24, c: 60, f: 19 },
  { id: 'wanton_mee', cat: 'Hawker', name: 'Wanton mee (dry)', portion: '1 plate', kcal: 420, p: 16, c: 58, f: 14 },
  { id: 'ban_mian', cat: 'Hawker', name: 'Ban mian (soup)', portion: '1 bowl', kcal: 480, p: 22, c: 62, f: 15 },
  { id: 'thunder_tea', cat: 'Hawker', name: 'Thunder tea rice (brown rice)', portion: '1 bowl', kcal: 520, p: 18, c: 72, f: 17 },
  { id: 'duck_rice', cat: 'Hawker', name: 'Braised duck rice', portion: '1 plate', kcal: 650, p: 30, c: 75, f: 24 },
  { id: 'char_siew_rice', cat: 'Hawker', name: 'Char siew rice', portion: '1 plate', kcal: 600, p: 25, c: 85, f: 17 },
  { id: 'nasi_lemak', cat: 'Hawker', name: 'Nasi lemak (chicken wing, egg, ikan bilis)', portion: '1 plate', kcal: 780, p: 26, c: 80, f: 40 },
  { id: 'nasi_padang', cat: 'Hawker', name: 'Nasi padang (rice + 3 dishes)', portion: '1 plate', kcal: 750, p: 30, c: 80, f: 34 },
  { id: 'ckt', cat: 'Hawker', name: 'Char kway teow', portion: '1 plate', kcal: 745, p: 23, c: 76, f: 38 },
  { id: 'hokkien_mee', cat: 'Hawker', name: 'Hokkien prawn mee', portion: '1 plate', kcal: 620, p: 22, c: 72, f: 26 },
  { id: 'laksa', cat: 'Hawker', name: 'Laksa', portion: '1 bowl', kcal: 590, p: 22, c: 50, f: 33 },
  { id: 'mee_rebus', cat: 'Hawker', name: 'Mee rebus', portion: '1 bowl', kcal: 570, p: 18, c: 82, f: 18 },
  { id: 'mee_goreng', cat: 'Hawker', name: 'Mee goreng', portion: '1 plate', kcal: 660, p: 18, c: 85, f: 27 },
  { id: 'fried_rice', cat: 'Hawker', name: 'Egg fried rice', portion: '1 plate', kcal: 640, p: 18, c: 85, f: 24 },
  { id: 'carrot_cake', cat: 'Hawker', name: 'Fried carrot cake (white)', portion: '1 plate', kcal: 520, p: 12, c: 55, f: 28 },
  { id: 'prata_plain', cat: 'Hawker', name: 'Roti prata (plain) + curry', portion: '1 piece', kcal: 230, p: 5, c: 30, f: 10 },
  { id: 'prata_egg', cat: 'Hawker', name: 'Roti prata (egg) + curry', portion: '1 piece', kcal: 290, p: 10, c: 32, f: 14 },
  { id: 'chapati', cat: 'Hawker', name: 'Chapati ×2 + dhal', portion: '1 set', kcal: 400, p: 15, c: 62, f: 10 },
  { id: 'satay', cat: 'Hawker', name: 'Chicken satay ×10 + peanut sauce', portion: '10 sticks', kcal: 560, p: 40, c: 22, f: 34 },
  { id: 'popiah', cat: 'Hawker', name: 'Popiah', portion: '1 roll', kcal: 190, p: 6, c: 28, f: 6 },
  { id: 'mala', cat: 'Hawker', name: 'Mala xiang guo (shared bowl, your half)', portion: '½ bowl', kcal: 700, p: 25, c: 40, f: 48 },
  { id: 'claypot', cat: 'Hawker', name: 'Claypot chicken rice', portion: '1 pot', kcal: 750, p: 30, c: 95, f: 26 },
  { id: 'kway_chap', cat: 'Hawker', name: 'Kway chap set', portion: '1 set', kcal: 640, p: 30, c: 60, f: 30 },
  { id: 'chx_breast_sides', cat: 'Hawker', name: 'Grilled chicken + veg (no rice)', portion: '1 plate', kcal: 380, p: 42, c: 12, f: 17, tip: true },

  // HeyBo & bowls (estimates — check the HeyBo app for your exact build)
  { id: 'heybo_std', cat: 'HeyBo & Bowls', name: 'HeyBo warm bowl — standard build', portion: '1 bowl', kcal: 650, p: 35, c: 65, f: 26 },
  { id: 'heybo_lean', cat: 'HeyBo & Bowls', name: 'HeyBo — greens + ½ grain, chicken, light sauce', portion: '1 bowl', kcal: 480, p: 40, c: 40, f: 17, tip: true },
  { id: 'heybo_dbl', cat: 'HeyBo & Bowls', name: 'HeyBo — double protein, ½ grain', portion: '1 bowl', kcal: 620, p: 55, c: 45, f: 22, tip: true },
  { id: 'heybo_salmon', cat: 'HeyBo & Bowls', name: 'HeyBo — salmon + grain bowl', portion: '1 bowl', kcal: 700, p: 36, c: 62, f: 32 },
  { id: 'poke', cat: 'HeyBo & Bowls', name: 'Poke bowl (rice, tuna/salmon)', portion: '1 bowl', kcal: 620, p: 32, c: 75, f: 20 },
  { id: 'salad_chx', cat: 'HeyBo & Bowls', name: 'Salad bowl + grilled chicken + vinaigrette', portion: '1 bowl', kcal: 450, p: 38, c: 25, f: 22 },
  { id: 'add_egg', cat: 'HeyBo & Bowls', name: 'Add-on: onsen / boiled egg', portion: '1 egg', kcal: 75, p: 6, c: 0, f: 5 },
  { id: 'add_sauce', cat: 'HeyBo & Bowls', name: 'Add-on: creamy sauce / dressing', portion: '1 portion', kcal: 120, p: 0, c: 4, f: 12 },

  // Delivery
  { id: 'thai_basil', cat: 'Delivery', name: 'Thai basil chicken rice + fried egg', portion: '1 plate', kcal: 750, p: 32, c: 85, f: 30 },
  { id: 'katsu_curry', cat: 'Delivery', name: 'Chicken katsu curry rice', portion: '1 plate', kcal: 1000, p: 35, c: 120, f: 42 },
  { id: 'teriyaki_don', cat: 'Delivery', name: 'Chicken teriyaki don', portion: '1 bowl', kcal: 720, p: 35, c: 100, f: 18 },
  { id: 'sushi', cat: 'Delivery', name: 'Sushi (8 pcs nigiri/maki)', portion: '8 pcs', kcal: 400, p: 18, c: 70, f: 5 },
  { id: 'sashimi', cat: 'Delivery', name: 'Salmon sashimi (10 slices)', portion: '10 slices', kcal: 330, p: 34, c: 0, f: 21, tip: true },
  { id: 'ramen', cat: 'Delivery', name: 'Tonkotsu ramen', portion: '1 bowl', kcal: 850, p: 32, c: 85, f: 40 },
  { id: 'burger_meal', cat: 'Delivery', name: 'Burger + fries + soft drink', portion: '1 meal', kcal: 1150, p: 35, c: 140, f: 50 },
  { id: 'mcspicy', cat: 'Delivery', name: 'McSpicy (burger only)', portion: '1', kcal: 530, p: 24, c: 46, f: 27 },
  { id: 'kfc2', cat: 'Delivery', name: 'Fried chicken, 2 pieces', portion: '2 pcs', kcal: 600, p: 40, c: 20, f: 38 },
  { id: 'pizza', cat: 'Delivery', name: 'Pizza (2 slices, regular)', portion: '2 slices', kcal: 560, p: 24, c: 66, f: 22 },
  { id: 'subway', cat: 'Delivery', name: 'Subway 6" chicken breast, no mayo', portion: '1 sub', kcal: 380, p: 28, c: 48, f: 7, tip: true },
  { id: 'carbonara', cat: 'Delivery', name: 'Pasta carbonara', portion: '1 plate', kcal: 900, p: 30, c: 90, f: 46 },
  { id: 'butter_chx', cat: 'Delivery', name: 'Butter chicken + rice + naan', portion: '1 meal', kcal: 1150, p: 40, c: 130, f: 50 },
  { id: 'tandoori', cat: 'Delivery', name: 'Tandoori chicken (half) + raita', portion: '1 serve', kcal: 450, p: 50, c: 10, f: 22, tip: true },
  { id: 'kbbq_bibimbap', cat: 'Delivery', name: 'Bibimbap (beef)', portion: '1 bowl', kcal: 700, p: 28, c: 95, f: 22 },
  { id: 'pho', cat: 'Delivery', name: 'Beef pho', portion: '1 bowl', kcal: 480, p: 30, c: 60, f: 12, tip: true },

  // Meal prep
  { id: 'mp_chx', cat: 'Meal Prep', name: 'Chicken breast (cooked)', portion: '150 g', kcal: 250, p: 46, c: 0, f: 5 },
  { id: 'mp_thigh', cat: 'Meal Prep', name: 'Chicken thigh, skinless (cooked)', portion: '150 g', kcal: 300, p: 38, c: 0, f: 15 },
  { id: 'mp_salmon', cat: 'Meal Prep', name: 'Salmon fillet (cooked)', portion: '150 g', kcal: 310, p: 33, c: 0, f: 19 },
  { id: 'mp_beef', cat: 'Meal Prep', name: 'Lean beef mince (cooked)', portion: '150 g', kcal: 330, p: 39, c: 0, f: 19 },
  { id: 'mp_tofu', cat: 'Meal Prep', name: 'Firm tofu', portion: '150 g', kcal: 180, p: 20, c: 4, f: 10 },
  { id: 'mp_rice', cat: 'Meal Prep', name: 'White/brown rice (cooked)', portion: '1 cup / 200 g', kcal: 260, p: 5, c: 57, f: 1 },
  { id: 'mp_sweetpot', cat: 'Meal Prep', name: 'Sweet potato', portion: '200 g', kcal: 180, p: 3, c: 41, f: 0 },
  { id: 'mp_veg', cat: 'Meal Prep', name: 'Broccoli / mixed veg', portion: '1 cup', kcal: 50, p: 4, c: 9, f: 0 },
  { id: 'mp_oil', cat: 'Meal Prep', name: 'Cooking oil', portion: '1 tbsp', kcal: 120, p: 0, c: 0, f: 14 },
  { id: 'mp_box', cat: 'Meal Prep', name: 'Prep box: chicken 150g + rice 150g + veg', portion: '1 box', kcal: 500, p: 52, c: 52, f: 7, tip: true },

  // Breakfast
  { id: 'kaya_set', cat: 'Breakfast', name: 'Kaya toast set (2 toast, 2 eggs, kopi)', portion: '1 set', kcal: 470, p: 17, c: 52, f: 21 },
  { id: 'eggs2', cat: 'Breakfast', name: 'Eggs ×2 (boiled/poached)', portion: '2 eggs', kcal: 150, p: 12, c: 1, f: 10 },
  { id: 'oats', cat: 'Breakfast', name: 'Oats with milk', portion: '50 g oats', kcal: 300, p: 13, c: 42, f: 8 },
  { id: 'greek_yog', cat: 'Breakfast', name: 'Greek yoghurt 0% fat', portion: '200 g', kcal: 120, p: 20, c: 8, f: 0, tip: true },
  { id: 'toast_pb', cat: 'Breakfast', name: 'Wholemeal toast + peanut butter', portion: '2 slices', kcal: 360, p: 14, c: 34, f: 18 },
  { id: 'croissant', cat: 'Breakfast', name: 'Butter croissant', portion: '1', kcal: 270, p: 5, c: 30, f: 15 },

  // Snacks & protein
  { id: 'whey', cat: 'Snacks & Protein', name: 'Whey protein shake (water)', portion: '1 scoop', kcal: 120, p: 24, c: 3, f: 2, tip: true },
  { id: 'whey_milk', cat: 'Snacks & Protein', name: 'Whey shake with low-fat milk', portion: '1 scoop + 250ml', kcal: 240, p: 33, c: 15, f: 5 },
  { id: 'protein_bar', cat: 'Snacks & Protein', name: 'Protein bar', portion: '1 bar', kcal: 210, p: 20, c: 22, f: 7 },
  { id: 'banana', cat: 'Snacks & Protein', name: 'Banana', portion: '1 medium', kcal: 105, p: 1, c: 27, f: 0 },
  { id: 'apple', cat: 'Snacks & Protein', name: 'Apple', portion: '1 medium', kcal: 95, p: 0, c: 25, f: 0 },
  { id: 'almonds', cat: 'Snacks & Protein', name: 'Almonds / mixed nuts', portion: '30 g', kcal: 175, p: 6, c: 6, f: 15 },
  { id: 'chx_snack', cat: 'Snacks & Protein', name: 'Chicken breast snack pack (7-Eleven)', portion: '1 pack', kcal: 120, p: 23, c: 2, f: 2, tip: true },
  { id: 'chips', cat: 'Snacks & Protein', name: 'Potato chips', portion: 'small bag 40g', kcal: 210, p: 3, c: 21, f: 13 },
  { id: 'chocolate', cat: 'Snacks & Protein', name: 'Chocolate bar', portion: '1 bar 45g', kcal: 240, p: 3, c: 27, f: 13 },
  { id: 'cake', cat: 'Snacks & Protein', name: 'Slice of cake', portion: '1 slice', kcal: 400, p: 5, c: 50, f: 20 },
  { id: 'icecream', cat: 'Snacks & Protein', name: 'Ice cream', portion: '1 scoop', kcal: 150, p: 3, c: 18, f: 8 },

  // Drinks
  { id: 'kopi', cat: 'Drinks', name: 'Kopi / Teh (condensed milk)', portion: '1 cup', kcal: 110, p: 2, c: 18, f: 3 },
  { id: 'kopi_c', cat: 'Drinks', name: 'Kopi-C / Teh-C', portion: '1 cup', kcal: 80, p: 2, c: 13, f: 2 },
  { id: 'kopi_c_ks', cat: 'Drinks', name: 'Kopi-C kosong / Teh-C kosong', portion: '1 cup', kcal: 35, p: 2, c: 3, f: 2, tip: true },
  { id: 'kopi_o_ks', cat: 'Drinks', name: 'Kopi-O kosong / black coffee', portion: '1 cup', kcal: 5, p: 0, c: 0, f: 0, tip: true },
  { id: 'latte', cat: 'Drinks', name: 'Latte (regular, full milk)', portion: '1 cup', kcal: 190, p: 10, c: 15, f: 10 },
  { id: 'bbt_0', cat: 'Drinks', name: 'Bubble tea, 0% sugar, with pearls', portion: '1 cup', kcal: 260, p: 2, c: 50, f: 6 },
  { id: 'bbt_50', cat: 'Drinks', name: 'Bubble tea, 50% sugar, with pearls', portion: '1 cup', kcal: 350, p: 2, c: 72, f: 6 },
  { id: 'soft_drink', cat: 'Drinks', name: 'Soft drink (can)', portion: '330 ml', kcal: 140, p: 0, c: 35, f: 0 },
  { id: 'zero', cat: 'Drinks', name: 'Coke Zero / diet drink', portion: '330 ml', kcal: 1, p: 0, c: 0, f: 0 },
  { id: 'beer', cat: 'Drinks', name: 'Beer', portion: '1 pint', kcal: 230, p: 2, c: 18, f: 0 },
  { id: 'wine_glass', cat: 'Drinks', name: 'Red wine', portion: '1 glass 150ml', kcal: 125, p: 0, c: 4, f: 0 },
  { id: 'wine_bottle', cat: 'Drinks', name: 'Red wine', portion: '1 bottle 750ml', kcal: 625, p: 0, c: 20, f: 0 },
  { id: 'soy_milk', cat: 'Drinks', name: 'Soy milk, unsweetened', portion: '250 ml', kcal: 90, p: 8, c: 3, f: 5 },
];

const COACH_TIPS = [
  'Protein first: build every meal around a palm-sized+ portion of meat, fish, tofu or eggs. Aim ~55 g protein per meal across your 2 meals, plus a shake.',
  'At the hawker: ask for "less rice" (shao fan) and "no gravy". It saves 150–250 kcal a meal with zero effort.',
  'Sliced fish soup, yong tau foo soup and chicken rice with plain rice are your hawker go-tos.',
  'Progressive overload is the whole game: each week, beat last week by one rep or a little weight. The app shows you the target.',
  'Your lower back: brace like someone\'s about to poke your stomach before every rep. Ribs down, glutes squeezed.',
  'Abs are revealed in the kitchen but built in the gym. Train them 2–3× a week with load (cable crunches), not hundreds of sit-ups.',
  'Wine night? A bottle is ~625 kcal — a third of your day. Have 1–2 glasses, and keep protein high that day.',
  'Sleep 7+ hours. Short sleep makes you hungrier and makes your body hold on to fat and lose muscle.',
  'Steps matter: push from 8k to 10k a day. That\'s ~100 extra kcal burned daily without feeling it.',
  'Weigh yourself every morning after the toilet, before food. Only the 7-day average matters — daily swings of 1 kg are just water.',
  'Skipping breakfast is fine for you. Just hit your protein across your 2 meals + a shake.',
  'Leave 2–3 reps in the tank on most sets. Grinding to failure on every set makes recovery harder in a calorie deficit.',
  'Grid classes count as your conditioning. Don\'t do Grid right before Lower days if you can avoid it.',
  'Desk job tip: every hour, stand up and do 10 glute squeezes + a hip flexor stretch. Your lower back will thank you.',
];
