export const DEFAULT_CONTENT = {
  heroTitle:    { en: 'Aim higher.\nStand together.',    fr: 'Viser plus haut.\nRester unis.' },
  heroEyebrow:  { en: '763 Bouctouche · Established 1971', fr: 'Escadron 763 Bouctouche · Fondé en 1971' },
  heroLead: {
    en: 'A youth program for ages 12 to 18 that builds citizenship, leadership and a love of aviation — free of charge, every Wednesday night in Ste-Marie-de-Kent.',
    fr: 'Un programme pour les jeunes de 12 à 18 ans qui développe le civisme, le leadership et l’amour de l’aviation — gratuit, chaque mercredi soir à Ste-Marie-de-Kent.',
  },

  aboutEyebrow: { en: 'About the squadron', fr: 'À propos de l’escadron' },
  aboutTitle:   { en: 'A community squadron rooted in Kent County since 1971.', fr: 'Un escadron communautaire ancré dans le comté de Kent depuis 1971.' },
  aboutBody: {
    en: '763 Bouctouche has trained young Canadians in citizenship, leadership and aviation for more than five decades. We are part of the national Royal Canadian Air Cadet program, run in partnership with the Air Cadet League of Canada and the Canadian Armed Forces.',
    fr: 'L’escadron 763 Bouctouche forme de jeunes Canadiens au civisme, au leadership et à l’aviation depuis plus de cinquante ans. Nous faisons partie du programme national des Cadets de l’Aviation royale du Canada, en partenariat avec la Ligue des Cadets de l’Air et les Forces armées canadiennes.',
  },
  aboutBody2: {
    en: 'Cadets pay nothing — uniforms, instruction, travel and summer training are all provided. Our role is simple: give young people skills, friendships and confidence to take on whatever comes next.',
    fr: 'Les cadets ne paient rien — uniformes, instruction, déplacements et camps d’été sont tous fournis. Notre rôle est simple : offrir aux jeunes les compétences, les amitiés et la confiance pour aborder l’avenir.',
  },
  missionTitle: { en: 'Mission', fr: 'Mission' },
  missionBody: {
    en: 'Develop in youth the attributes of good citizenship and leadership; promote physical fitness; and stimulate interest in the air activities of the Canadian Armed Forces.',
    fr: 'Développer chez les jeunes les qualités de civisme et de leadership, promouvoir la condition physique et stimuler l’intérêt envers les activités aériennes des Forces armées canadiennes.',
  },
  values: {
    en: ['Loyalty', 'Professionalism', 'Mutual respect', 'Integrity'],
    fr: ['Loyauté', 'Professionnalisme', 'Respect mutuel', 'Intégrité'],
  },

  pillarsTitle: { en: 'What cadets actually do', fr: 'Ce que font réellement les cadets' },
  pillarsLead: {
    en: 'A balanced year of aviation, leadership and adventure — backed by free summer camps across Canada.',
    fr: 'Une année équilibrée d’aviation, de leadership et d’aventure — appuyée par des camps d’été gratuits à travers le Canada.',
  },

  contactTitle: {
    en: 'Drop in any Wednesday night.',
    fr: 'Passez nous voir un mercredi soir.',
  },
  contactBody: {
    en: 'No appointment needed. Bring your son or daughter to a parade night — we’ll show you around, introduce the staff, and answer any questions.',
    fr: 'Aucun rendez-vous requis. Amenez votre jeune un mercredi soir — visite guidée, présentation du personnel, et réponses à vos questions.',
  },
};

export const ACTIVITIES = [
  { tag: { en: 'Aviation', fr: 'Aviation' },
    title: { en: 'Power & gliding', fr: 'Vol motorisé et planeur' },
    body: { en: 'Ground school, familiarization flights, and a path to your Transport Canada pilot scholarship.',
            fr: 'École au sol, vols d’initiation et accès à la bourse de pilote de Transport Canada.' } },
  { tag: { en: 'Drill', fr: 'Exercice militaire' },
    title: { en: 'Parade & ceremony', fr: 'Parade et cérémonie' },
    body: { en: 'Weekly drill, marksmanship, and ceremonial events that build precision and pride.',
            fr: 'Exercice hebdomadaire, tir de précision et cérémonies qui forgent la rigueur et la fierté.' } },
  { tag: { en: 'Outdoors', fr: 'Plein air' },
    title: { en: 'Survival & expedition', fr: 'Survie et expédition' },
    body: { en: 'Field training exercises, navigation, biathlon, and winter survival skills.',
            fr: 'Exercices en campagne, navigation, biathlon et techniques de survie hivernale.' } },
  { tag: { en: 'Citizenship', fr: 'Civisme' },
    title: { en: 'Community service', fr: 'Service communautaire' },
    body: { en: 'Remembrance Day, parades and fundraising — visible support for Kent County.',
            fr: 'Jour du Souvenir, défilés et collectes de fonds — un appui concret au comté de Kent.' } },
  { tag: { en: 'Music', fr: 'Musique' },
    title: { en: 'Band program', fr: 'Programme de musique' },
    body: { en: 'Brass, reed and pipe band opportunities — at the squadron and at summer camps.',
            fr: 'Cuivres, bois et cornemuses — à l’escadron et lors des camps d’été.' } },
  { tag: { en: 'Summer', fr: 'Été' },
    title: { en: 'Summer training', fr: 'Camps d’été' },
    body: { en: 'Two- to seven-week courses across Canada, fully paid, with weekly allowance.',
            fr: 'Cours de 2 à 7 semaines à travers le Canada, payés, avec allocation hebdomadaire.' } },
];

export const STAFF = [
  { name: 'Capt. M. Cormier',  rank: 'CO',    role: { en: 'Commanding Officer',    fr: 'Commandant' } },
  { name: 'Lt. S. LeBlanc',    rank: 'DCO',   role: { en: 'Deputy CO',             fr: 'Commandant adjoint' } },
  { name: 'CI J. Richard',     rank: 'TrgO',  role: { en: 'Training Officer',      fr: 'Officier d’instruction' } },
  { name: 'CI A. Babineau',    rank: 'AdmO',  role: { en: 'Admin Officer',         fr: 'Officier d’administration' } },
  { name: '2Lt. P. Doiron',    rank: 'SuppO', role: { en: 'Supply Officer',        fr: 'Officier d’approvisionnement' } },
  { name: 'CI N. Maillet',     rank: 'CI',    role: { en: 'Civilian Instructor',   fr: 'Instructeur civil' } },
  { name: 'CWO E. Bourque',    rank: 'CWO',   role: { en: 'Cadet Warrant Officer', fr: 'Adjudant-chef cadet' } },
  { name: 'F/Sgt. R. Gallant', rank: 'F/Sgt', role: { en: 'Flight Sergeant',       fr: 'Sergent de section' } },
];

export const POSTS = [
  { id: 1, cat: 'events', date: '2025-10-22', likes: 47, comments: 6, shares: 3,
    image: 'parade-night-october',
    title: { en: 'Annual Review Parade — November 22', fr: 'Revue annuelle — 22 novembre' },
    body: {
      en: 'Save the date! Our 54th Annual Review Parade takes place at the Bouctouche community centre on Saturday, November 22 at 14:00. Family and friends welcome — refreshments to follow.',
      fr: 'À noter! Notre 54e revue annuelle aura lieu au centre communautaire de Bouctouche, samedi le 22 novembre à 14 h. Famille et amis bienvenus — goûter à suivre.',
    } },
  { id: 2, cat: 'training', date: '2025-10-15', likes: 62, comments: 11, shares: 4,
    image: 'gliding-summer',
    title: { en: '4 cadets selected for Glider Pilot Scholarship', fr: '4 cadets sélectionnés pour la bourse de pilote de planeur' },
    body: {
      en: 'Congratulations to F/Sgt Gallant, Sgt Léger, Cpl. Arsenault and LAC Vautour — all four have been selected for the 2026 Glider Pilot Scholarship. They will spend six weeks at Debert this summer earning their wings.',
      fr: 'Félicitations au Sgt s Gallant, au Sgt Léger, au Cpl Arsenault et au Cdt 1 Vautour — tous quatre sont sélectionnés pour la bourse de pilote de planeur 2026. Six semaines à Debert cet été pour obtenir leurs ailes.',
    } },
  { id: 3, cat: 'community', date: '2025-10-08', likes: 89, comments: 14, shares: 12,
    image: 'remembrance-day',
    title: { en: 'Volunteers needed: Poppy Campaign', fr: 'Bénévoles recherchés : Campagne du coquelicot' },
    body: {
      en: 'The Royal Canadian Legion (Branch 56) has asked our cadets to help distribute poppies the weekend of November 1–2. Sign up sheet at parade night — every cadet is encouraged to take a 2-hour shift.',
      fr: 'La Légion royale canadienne (Filiale 56) demande l’aide de nos cadets pour distribuer les coquelicots les 1 et 2 novembre. Feuille d’inscription le soir d’entraînement — chaque cadet est encouragé à prendre un quart de 2 heures.',
    } },
  { id: 4, cat: 'training', date: '2025-09-28', likes: 53, comments: 4, shares: 2,
    image: 'biathlon-training',
    title: { en: 'Biathlon team forms for the season', fr: 'L’équipe de biathlon est formée pour la saison' },
    body: {
      en: 'Twelve cadets are training for the regional biathlon competition in February. Dry-firing and ski technique sessions every Saturday morning at the Kent recreation centre.',
      fr: 'Douze cadets s’entraînent pour la compétition régionale de biathlon en février. Tir à blanc et technique de ski tous les samedis matins au centre récréatif de Kent.',
    } },
  { id: 5, cat: 'events', date: '2025-09-20', likes: 38, comments: 2, shares: 1,
    image: 'first-night',
    title: { en: 'First parade night — welcome back!', fr: 'Premier soir d’entraînement — bon retour!' },
    body: {
      en: 'Great turnout for our season opener — 38 cadets on parade including 9 new faces. Reminder: uniform inspection next Wednesday at 18:30 sharp.',
      fr: 'Belle participation pour notre soirée d’ouverture — 38 cadets en formation, dont 9 nouveaux visages. Rappel : inspection d’uniforme mercredi prochain à 18 h 30 pile.',
    } },
  { id: 6, cat: 'community', date: '2025-09-12', likes: 71, comments: 9, shares: 5,
    image: 'highway-cleanup',
    title: { en: 'Highway 525 cleanup — 14 bags collected', fr: 'Nettoyage Route 525 — 14 sacs ramassés' },
    body: {
      en: 'Saturday morning well spent — cadets cleaned the 4 km stretch of Route 525 in front of the squadron and collected 14 bags of roadside trash. Thank you to the Department of Transportation for the safety vests.',
      fr: 'Belle matinée samedi — les cadets ont nettoyé les 4 km de la Route 525 devant l’escadron et ramassé 14 sacs de déchets. Merci au ministère des Transports pour les dossards.',
    } },
];
