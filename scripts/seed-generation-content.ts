
/**
 * File: seed-generation-content.ts
 * Responsibility: Seeds database with name generation data and starting equipment for crawler creation
 * Notes: Populates corporation names, human names, competencies, and contextual starting equipment tables
 */
import { db } from "../server/db";
import {
  corporationPrefixes,
  corporationSuffixes,
  humanFirstNames,
  humanLastNames,
  competencies,
  startingEquipment,
} from "@shared/schema";

async function seedGenerationContent() {
  console.log("Seeding generation content...");

  try {
    // Corporation prefixes
    console.log("Seeding corporation prefixes...");
    const prefixes = [
      "Stellar", "Cosmic", "Quantum", "Neural", "Cyber", "Nano", "Void", "Dark",
      "Prime", "Omega", "Alpha", "Beta", "Gamma", "Delta", "Nexus", "Core",
      "Apex", "Matrix", "Vector", "Phoenix", "Titan", "Nova", "Orbital", "Galactic"
    ];
    
    await db.insert(corporationPrefixes).values(
      prefixes.map(name => ({ name, weight: 1 }))
    );

    // Corporation suffixes
    console.log("Seeding corporation suffixes...");
    const suffixes = [
      "Industries", "Corporation", "Enterprises", "Dynamics", "Systems",
      "Technologies", "Solutions", "Consortium", "Holdings", "Syndicate",
      "Alliance", "Collective", "Federation", "Empire", "Conglomerate",
      "Group", "Labs", "Works"
    ];
    
    await db.insert(corporationSuffixes).values(
      suffixes.map(name => ({ name, weight: 1 }))
    );

    // Human first names
    console.log("Seeding human first names...");
    const firstNames = [
      "Aaron", "Adam", "Adrian", "Albert", "Alexander", "Andrew", "Anthony", "Arthur",
      "Benjamin", "Brian", "Bruce", "Carl", "Charles", "Christopher", "Daniel", "David",
      "Dennis", "Donald", "Douglas", "Earl", "Edward", "Eric", "Eugene", "Frank",
      "Gary", "George", "Gerald", "Gregory", "Harold", "Henry", "Jack", "James",
      "Jason", "Jeffrey", "Jerry", "John", "Joseph", "Joshua", "Kenneth", "Kevin",
      "Lawrence", "Mark", "Matthew", "Michael", "Nicholas", "Patrick", "Paul", "Peter",
      "Philip", "Raymond", "Richard", "Robert", "Roger", "Ronald", "Russell", "Samuel",
      "Scott", "Stephen", "Steven", "Thomas", "Timothy", "Walter", "Wayne", "William",
      "Leonard", "Stanley", "Ralph", "Louis",
      "Alice", "Amanda", "Amy", "Andrea", "Angela", "Anna", "Anne", "Barbara",
      "Betty", "Beverly", "Brenda", "Carol", "Catherine", "Christine", "Cynthia",
      "Deborah", "Diana", "Donna", "Dorothy", "Elizabeth", "Emily", "Frances",
      "Francine", "Helen", "Janet", "Janice", "Jean", "Jennifer", "Jessica",
      "Joan", "Joyce", "Judith", "Julie", "Karen", "Katherine", "Kathleen",
      "Kelly", "Kimberly", "Laura", "Linda", "Lisa", "Margaret", "Maria",
      "Marie", "Martha", "Mary", "Michelle", "Nancy", "Nicole", "Pamela",
      "Patricia", "Rachel", "Rebecca", "Ruth", "Sandra", "Sarah", "Sharon",
      "Stephanie", "Susan", "Teresa", "Virginia", "Wanda", "Gloria", "Rose",
      "Evelyn", "Mildred", "Florence", "Irene", "Grace", "Carolyn"
    ];
    
    await db.insert(humanFirstNames).values(
      firstNames.map(name => ({ name, weight: 1 }))
    );

    // Human last names
    console.log("Seeding human last names...");
    const lastNames = [
      "Adams", "Allen", "Anderson", "Baker", "Barnes", "Bell", "Bennett", "Brooks",
      "Brown", "Butler", "Campbell", "Carter", "Clark", "Collins", "Cooper", "Cox",
      "Davis", "Edwards", "Evans", "Fisher", "Foster", "Garcia", "Gray", "Green",
      "Hall", "Harris", "Henderson", "Hill", "Howard", "Hughes", "Jackson", "James",
      "Johnson", "Jones", "Kelly", "King", "Lee", "Lewis", "Long", "Lopez",
      "Martin", "Martinez", "McArthur", "Miller", "Mitchell", "Moore", "Morgan",
      "Morris", "Murphy", "Nelson", "Parker", "Patterson", "Perez", "Peterson",
      "Phillips", "Powell", "Price", "Reed", "Richardson", "Roberts", "Robinson",
      "Rodriguez", "Rogers", "Ross", "Russell", "Sanchez", "Scott", "Simmons",
      "Smith", "Stewart", "Taylor", "Thomas", "Thompson", "Turner", "Walker",
      "Ward", "Washington", "Watson", "White", "Williams", "Wilson", "Wood",
      "Wright", "Young", "Armstrong", "Bryant", "Crawford", "Duncan", "Ferguson",
      "Fletcher", "Graham", "Hampton", "Harrison", "Irving", "Lawson", "Maxwell",
      "Preston", "Sullivan", "Thornton", "Vaughn", "Blackwood", "Fairfax",
      "Goodwin", "Harrington", "Lancaster", "Mansfield", "Montgomery", "Pemberton",
      "Sinclair", "Whitmore", "Worthington", "Ashford", "Bradford", "Donovan",
      "Grayson", "Hartwell"
    ];
    
    await db.insert(humanLastNames).values(
      lastNames.map(name => ({ name, weight: 1 }))
    );

    // Competencies
    console.log("Seeding competencies...");
    const competenciesList = [
      { name: "Scavenging", description: "Finding useful items in debris" },
      { name: "Lock Picking", description: "Opening locked containers and doors" },
      { name: "Electronics", description: "Understanding and repairing electronic devices" },
      { name: "First Aid", description: "Basic medical treatment and healing" },
      { name: "Stealth", description: "Moving unseen and unheard" },
      { name: "Combat Reflexes", description: "Quick reactions in dangerous situations" },
      { name: "Jury Rigging", description: "Creating temporary solutions from available materials" },
      { name: "Negotiation", description: "Persuading others through dialogue" },
      { name: "Intimidation", description: "Using fear to influence others" },
      { name: "Hacking", description: "Breaking into computer systems" },
      { name: "Demolitions", description: "Using explosives safely and effectively" },
      { name: "Survival", description: "Thriving in harsh environments" },
      { name: "Leadership", description: "Inspiring and directing others" },
      { name: "Marksmanship", description: "Accurate shooting with ranged weapons" },
      { name: "Athletics", description: "Physical prowess and endurance" },
      { name: "Engineering", description: "Understanding complex mechanical systems" },
      { name: "Chemistry", description: "Knowledge of chemical reactions and compounds" },
      { name: "Psychology", description: "Understanding human behavior and motivation" },
      { name: "Linguistics", description: "Communication across language barriers" },
      { name: "Navigation", description: "Finding your way in unknown territory" }
    ];
    
    await db.insert(competencies).values(competenciesList);

    // Starting equipment
    console.log("Seeding starting equipment...");
    const equipmentData = [
      // Survival gear
      { category: "survival", name: "Emergency Rations", description: "Compressed nutrition bars" },
      { category: "survival", name: "Nutrient Paste", description: "Emergency food rations" },
      { category: "survival", name: "Water Recycler", description: "Converts moisture into drinking water" },
      { category: "survival", name: "Thermal Blanket", description: "Reflective emergency shelter" },
      { category: "survival", name: "Multi-tool", description: "Basic cutting and repair implement" },
      { category: "survival", name: "Credit Chip", description: "Contains 50 emergency credits" },
      { category: "survival", name: "Stim Pack", description: "Basic medical supplies" },
      { category: "survival", name: "Flashlight", description: "Battery-powered illumination" },
      { category: "survival", name: "Water Purification Tablets", description: "Makes questionable water safer" },
      { category: "survival", name: "Rope Coil", description: "20 meters of synthetic climbing rope" },
      { category: "survival", name: "Fire Starter", description: "Magnesium striker with tinder" },

      // Personal items
      { category: "personal", name: "Wedding Ring", description: "Worn platinum band, still warm" },
      { category: "personal", name: "Family Photo", description: "Cracked holoframe showing happier times" },
      { category: "personal", name: "Lucky Dice", description: "Clearly haven't been working lately" },
      { category: "personal", name: "Diary", description: "Half-burned journal with torn pages" },
      { category: "personal", name: "Pocket Watch", description: "Stopped at the exact moment everything went wrong" },
      { category: "personal", name: "House Key", description: "To a home that no longer exists" },
      { category: "personal", name: "Love Letters", description: "From someone who's probably dead now" },
      { category: "personal", name: "Childhood Toy", description: "A stuffed animal, one eye missing" },
      { category: "personal", name: "Concert Ticket", description: "For a show that never happened" },
      { category: "personal", name: "Business Card", description: "Your old job, your old life" },

      // Weird items
      { category: "weird", name: "Rubber Duck", description: "Squeaks ominously when pressed" },
      { category: "weird", name: "Magic 8-Ball", description: "All answers are 'Outlook not so good'" },
      { category: "weird", name: "Broken Violin", description: "Missing three strings and hope" },
      { category: "weird", name: "Expired Lottery Ticket", description: "Would have won 10 million credits" },
      { category: "weird", name: "Pet Rock", description: "Named Gerald, good listener" },
      { category: "weird", name: "Fake Mustache", description: "For when you need to be someone else" },
      { category: "weird", name: "Unopened Fortune Cookie", description: "Too afraid to read the fortune" },
      { category: "weird", name: "Mood Ring", description: "Permanently stuck on 'despair'" },
      { category: "weird", name: "Snow Globe", description: "Contains tiny city that looks suspiciously like home" },
      { category: "weird", name: "Rubber Chicken", description: "Makes realistic screaming sounds" },
      { category: "weird", name: "Whoopee Cushion", description: "Because even apocalypses need comedy" },
      { category: "weird", name: "Origami Crane", description: "Made from eviction notice" },

      // Contextual gear - medical
      { category: "contextual", name: "Medical Scanner", description: "Handheld diagnostic device", contextualTrigger: "medical" },
      { category: "contextual", name: "Expired Painkillers", description: "Better than nothing", contextualTrigger: "medical" },
      { category: "contextual", name: "Tongue Depressor", description: "Wooden stick of hope", contextualTrigger: "medical" },
      { category: "contextual", name: "Stethoscope", description: "Listen to your heart break", contextualTrigger: "medical" },

      // Contextual gear - research
      { category: "contextual", name: "Data Pad", description: "Encrypted research notes", contextualTrigger: "research" },
      { category: "contextual", name: "Safety Goggles", description: "Cracked but still protective", contextualTrigger: "research" },
      { category: "contextual", name: "Test Tube", description: "Contains unidentified green liquid", contextualTrigger: "research" },
      { category: "contextual", name: "Lab Notebook", description: "Documenting the end of the world", contextualTrigger: "research" },

      // Contextual gear - security/criminal
      { category: "contextual", name: "Ceramic Shiv", description: "Prison-made cutting tool", contextualTrigger: "security" },
      { category: "contextual", name: "Brass Knuckles", description: "Dented but functional", contextualTrigger: "security" },
      { category: "contextual", name: "Lock Pick Set", description: "For when doors don't cooperate", contextualTrigger: "security" },
      { category: "contextual", name: "Fake ID", description: "Someone else's face, your new life", contextualTrigger: "security" },

      // Contextual gear - food service
      { category: "contextual", name: "Chef's Knife", description: "Sharp and well-maintained", contextualTrigger: "food" },
      { category: "contextual", name: "Spice Packet", description: "Makes anything taste better", contextualTrigger: "food" },
      { category: "contextual", name: "Grease-Stained Apron", description: "Smells like home cooking", contextualTrigger: "food" },
      { category: "contextual", name: "Recipe Book", description: "Grandmother's secret techniques", contextualTrigger: "food" },

      // Contextual gear - tech
      { category: "contextual", name: "Portable Hard Drive", description: "Contains someone else's secrets", contextualTrigger: "tech" },
      { category: "contextual", name: "Jury-Rigged Phone", description: "Can probably hack a toaster", contextualTrigger: "tech" },
      { category: "contextual", name: "Circuit Board", description: "Might be useful for something", contextualTrigger: "tech" },
      { category: "contextual", name: "USB Drive", description: "Labeled 'DO NOT OPEN'", contextualTrigger: "tech" },

      // Contextual gear - education
      { category: "contextual", name: "Red Pen", description: "For marking final grades", contextualTrigger: "education" },
      { category: "contextual", name: "Textbook", description: "Everything you need to know (apparently not)", contextualTrigger: "education" },
      { category: "contextual", name: "Apple", description: "For the teacher you'll never see again", contextualTrigger: "education" },
      { category: "contextual", name: "Report Card", description: "All A's, fat lot of good it did", contextualTrigger: "education" }
    ];
    
    await db.insert(startingEquipment).values(equipmentData);

    console.log("Generation content seeding complete!");

  } catch (error) {
    console.error("Error seeding generation content:", error);
    throw error;
  }
}

async function run() {
  try {
    await seedGenerationContent();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

run();
