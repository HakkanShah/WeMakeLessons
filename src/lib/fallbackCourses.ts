import { GeneratedCourse } from "./ai";

// Helper to generate Unsplash image URLs with search-friendly keywords
// Uses simpler, more common keywords for better Unsplash results
const getImg = (text: string, _color?: string) => {
    // Extract key words and simplify for better Unsplash matches
    const simpleKeywords = text
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
        .split(' ')
        .slice(0, 2) // Take first 2 words only
        .join(' ');
    return `![${text}](https://source.unsplash.com/800x400/?${encodeURIComponent(simpleKeywords)})`;
};

export const fallbackCourses: Record<string, GeneratedCourse> = {
    "dinosaurs": {
        title: "Dino Discovery: Giants of the Past",
        description: "Travel back 65 million years to roam with the T-Rex, soar with Pterodactyls, and dig up ancient secrets.",
        learningObjectives: [
            "Identify major dinosaur groups (Carnivores vs Herbivores)",
            "Understand the fossilization process",
            "Explore theories about dinosaur extinction",
            "Learn about dinosaur habitats and behaviors"
        ],
        lessons: [
            {
                id: "dino_1",
                title: "Kings of the Cretaceous",
                content: `
# Meet the Titans

${getImg("Tyrannosaurus Rex")}

The **Tyrannosaurus Rex** (T-Rex) was one of the most fearsome predators to ever walk the Earth. Its name literally means *"Tyrant Lizard King"*!

## T-Rex Stats:
*   **Length**: 40 feet (like a school bus!)
*   **Teeth**: Size of bananas (serrated for crushing bone)
*   **Bite Force**: 12,800 pounds (strongest on land)

> **🦖 Fun Fact:** Even though T-Rex had tiny arms, they were super strong! Each arm could lift 400 lbs.

### The Gentle Giants
Not all dinosaurs were scary. The **Brachiosaurus** was a gentle giant that ate only plants (*herbivore*).

${getImg("Brachiosaurus Feeding", "51CF66")}

It used its long neck to reach high tree branches, just like a giraffe does today. These giants lived in herds to protect themselves from predators.
`,
                duration: 8,
                quiz: [
                    {
                        question: "What does 'Tyrannosaurus Rex' mean?",
                        options: ["Fast Runner", "Tyrant Lizard King", "Big Headed Lizard", "Sharp Tooth"],
                        correctAnswer: 1,
                        explanation: "It comes from Greek and Latin: Tyrannos (Tyrant), Sauros (Lizard), Rex (King)."
                    },
                    {
                        question: "A dinosaur that eats only plants is called a...",
                        options: ["Carnivore", "Omnivore", "Herbivore", "Insectivore"],
                        correctAnswer: 2,
                        explanation: "Herbivores are animals that evolved to eat only plant matter."
                    },
                    {
                        question: "How big was a T-Rex's tooth?",
                        options: ["Size of a grape", "Size of a banana", "Size of a watermelon", "Size of a pencil"],
                        correctAnswer: 1,
                        explanation: "T-Rex teeth could grow up to 12 inches long, including the root!"
                    }
                ]
            },
            {
                id: "dino_2",
                title: "Fossil Hunters",
                content: `
# How Do We Know?

Dinosaurs lived millions of years ago, long before humans. So how do we know they existed? The answer is **Fossils**!

${getImg("Paleontologist Digging", "FCC419")}

## What is a Fossil?
A fossil is the preserved remains or traces of animals, plants, and other organisms from the remote past.

### The Fossil Recipe:
1.  **Burial**: An animal dies and is quickly covered by mud or sand.
2.  **Pressure**: Over thousands of years, layers of earth press down.
3.  **Minerals**: Water seeps into bones and turns them into stone.
4.  **Discovery**: Wind or rain reveals the stone bone, or a *Paleontologist* digs it up!

> **⛏️ Career Check:** A scientist who studies fossils is called a **Paleontologist**.

${getImg("Dinosaur Skeleton Museum", "868e96")}
`,
                duration: 10,
                quiz: [
                    {
                        question: "What is a scientist who studies fossils called?",
                        options: ["Biologist", "Chemist", "Paleontologist", "Astronomer"],
                        correctAnswer: 2,
                        explanation: "Paleontology is the study of ancient life through fossils."
                    },
                    {
                        question: "What turns old bones into fossils?",
                        options: ["Minerals and time", "Magic", "Sunlight", "Ice"],
                        correctAnswer: 0,
                        explanation: "Minerals in groundwater replace the bone material over thousands of years, turning it to stone."
                    },
                    {
                        question: "What is the first step in becoming a fossil?",
                        options: ["Getting a sun tan", "Rapid burial by sediment", "Being eaten", "Freezing"],
                        correctAnswer: 1,
                        explanation: "Rapid burial protects the remains from scavengers and decay."
                    }
                ]
            },
            {
                id: "dino_3",
                title: "Dinosaur Habitats & Lifestyles",
                content: `
# Where Did Dinosaurs Live?

${getImg("Prehistoric Landscape", "51CF66")}

Dinosaurs lived on every continent, including Antarctica! Back then, the world looked very different.

## Different Habitats

### 🌲 Forests & Jungles
*   **Who lived here**: Long-necked sauropods like Diplodocus
*   **Why**: Plenty of tall trees to eat from
*   **Climate**: Warm and humid

### 🏜️ Deserts & Plains
*   **Who lived here**: Fast runners like Velociraptor
*   **Why**: Open spaces for hunting
*   **Climate**: Hot and dry

### 🌊 Coastal Areas
*   **Who lived here**: Swimming reptiles (not technically dinosaurs!)
*   **Why**: Fish and sea creatures to eat
*   **Climate**: Temperate

## Dinosaur Behaviors

${getImg("Dinosaur Nest Eggs", "FCC419")}

> **🥚 Nesting:** Dinosaurs laid eggs! Some species guarded their nests like modern birds do.

### Social Behaviors:
*   **Herding**: Many herbivores traveled in groups for protection
*   **Hunting Packs**: Some carnivores hunted together
*   **Migration**: Large herbivores moved to find fresh plants
`,
                duration: 9,
                quiz: [
                    {
                        question: "Did dinosaurs live in Antarctica?",
                        options: ["No, it was too cold", "Yes, on every continent", "Only flying ones", "We don't know"],
                        correctAnswer: 1,
                        explanation: "Fossils have been found on all continents. Antarctica was warmer back then!"
                    },
                    {
                        question: "How did baby dinosaurs hatch?",
                        options: ["Live birth", "From eggs", "From seeds", "Magic"],
                        correctAnswer: 1,
                        explanation: "Dinosaurs were egg-laying creatures, like modern birds and reptiles."
                    },
                    {
                        question: "Why did herbivores travel in herds?",
                        options: ["For fun", "To find mates", "For protection from predators", "They were lost"],
                        correctAnswer: 2,
                        explanation: "Safety in numbers! Predators are less likely to attack a large group."
                    }
                ]
            },
            {
                id: "dino_4",
                title: "The Great Extinction",
                content: `
# The Day the Dinosaurs Died

${getImg("Asteroid Impact Earth", "FF6B6B")}

About 66 million years ago, something terrible happened. In a single day, the reign of the dinosaurs ended.

## The Asteroid Theory

Scientists believe a massive asteroid (10 km wide!) struck Earth near what is now Mexico.

### What Happened:
1.  **Impact**: The asteroid hit with the force of billions of nuclear bombs
2.  **Fires**: Forests around the world caught fire
3.  **Dust Cloud**: Debris blocked out the sun for months
4.  **Darkness**: Plants couldn't grow, so herbivores starved
5.  **Extinction**: 75% of all species died

${getImg("Dinosaur Extinction", "868e96")}

## Who Survived?

> **🐊 Survivors:** Small mammals, birds (dinosaur descendants!), crocodiles, and sea creatures survived.

### Why Did They Survive?
*   **Small size**: Needed less food
*   **Underground living**: Protected from fire and cold
*   **Diverse diet**: Could eat whatever was available

## Birds ARE Dinosaurs!

${getImg("Chicken Bird Dinosaur", "FCC419")}

Here's a mind-blowing fact: **Birds are living dinosaurs!** They evolved from small, feathered theropods. So next time you see a chicken, you're looking at a dinosaur! 🐔
`,
                duration: 11,
                quiz: [
                    {
                        question: "What killed the dinosaurs?",
                        options: ["A flood", "An asteroid impact", "Disease", "Humans"],
                        correctAnswer: 1,
                        explanation: "A 10km asteroid struck near Mexico 66 million years ago."
                    },
                    {
                        question: "What percentage of species went extinct?",
                        options: ["10%", "25%", "50%", "75%"],
                        correctAnswer: 3,
                        explanation: "Three-quarters of all species on Earth died in the extinction event."
                    },
                    {
                        question: "Which animals today are actually dinosaurs?",
                        options: ["Crocodiles", "Lizards", "Birds", "Fish"],
                        correctAnswer: 2,
                        explanation: "Birds evolved from theropod dinosaurs and are their living descendants!"
                    },
                    {
                        question: "Why did small mammals survive?",
                        options: ["They could fly", "They needed less food", "They were lucky", "They hid in water"],
                        correctAnswer: 1,
                        explanation: "Small animals need less food and could survive on scarce resources."
                    }
                ]
            }
        ]
    },
    "space travel": {
        title: "Mission to Mars: Space Explorer",
        description: "Launch your own rocket, navigate the solar system, and plan the first human colony on Mars.",
        learningObjectives: [
            "Understand the physics of rockets (Newton's Laws)",
            "Map the planets of the Solar System",
            "Design a habitat for living on Mars",
            "Learn about astronaut life in space"
        ],
        lessons: [
            {
                id: "space_1",
                title: "3... 2... 1... Liftoff!",
                content: `
# How Rockets Work

To get to space, we need **speed**. A LOT of speed. We use massive engines to escape Earth's gravity.

${getImg("Rocket Launch Diagram", "FF6B6B")}

## Newton's Third Law
*For every action, there is an equal and opposite reaction.*

Think of a balloon 🎈. If you blow it up and let go, the air shoots **out the back**, and the balloon shoots **forward**.
Rockets work the same way! They burn fuel to shoot hot gas down, which pushes the rocket UP.

### The Stages of Flight
1.  **Launch**: Main engines ignite. Fire and smoke!
2.  **Stage Separation**: Heavy empty fuel tanks fall off to make the rocket lighter.
3.  **Orbit**: The rocket coasts around the Earth.

> **🚀 Speed Fact:** To escape Earth, a rocket must travel at **25,000 miles per hour**!
`,
                duration: 7,
                quiz: [
                    {
                        question: "What pushes a rocket up?",
                        options: ["Wind", "Hot gas pushing down", "Magnets", "Giant rubber bands"],
                        correctAnswer: 1,
                        explanation: "This is action and reaction! Gas goes down, rocket goes up."
                    },
                    {
                        question: "Why do parts of the rocket fall off?",
                        options: ["They are broken", "To make it lighter", "To hit aliens", "It's an accident"],
                        correctAnswer: 1,
                        explanation: "Dropping empty fuel tanks reduces weight, allowing the rocket to go faster with less fuel."
                    },
                    {
                        question: "How fast must a rocket go to escape Earth?",
                        options: ["100 mph", "1,000 mph", "25,000 mph", "1,000,000 mph"],
                        correctAnswer: 2,
                        explanation: "This is called 'Escape Velocity'."
                    }
                ]
            },
            {
                id: "space_2",
                title: "Tour of the Solar System",
                content: `
# Our Cosmic Neighborhood

We live in the **Solar System**, a family of 8 planets orbiting our star, the **Sun**.

${getImg("Solar System Map", "339AF0")}

## The Inner Planets (Rocky)
1.  **Mercury**: Hot and fast.
2.  **Venus**: Thick toxic clouds.
3.  **Earth**: Our home! 🌍
4.  **Mars**: The Red Planet. Destination for humans!

## The Outer Giants (Gas & Ice)
5.  **Jupiter**: The King. It has a storm called the Great Red Spot.
6.  **Saturn**: Famous for its beautiful rings.
7.  **Uranus**: Spins on its side.
8.  **Neptune**: Windy and blue.

> **☀️ Solar Fact:** The Sun makes up 99.8% of all the mass in the Solar System. It's huge!
`,
                duration: 9,
                quiz: [
                    {
                        question: "Which planet is known as the Red Planet?",
                        options: ["Venus", "Mars", "Jupiter", "Saturn"],
                        correctAnswer: 1,
                        explanation: "Mars looks red because of rusty iron dust on its surface."
                    },
                    {
                        question: "Which is the largest planet?",
                        options: ["Earth", "Jupiter", "Neptune", "Mars"],
                        correctAnswer: 1,
                        explanation: "Jupiter is so big that 1,300 Earths could fit inside it!"
                    },
                    {
                        question: "What is at the center of our Solar System?",
                        options: ["Earth", "The Moon", "The Sun", "A Black Hole"],
                        correctAnswer: 2,
                        explanation: "The Sun's gravity holds all the planets in orbit around it."
                    }
                ]
            },
            {
                id: "space_3",
                title: "Life as an Astronaut",
                content: `
# Living in Zero Gravity

${getImg("Astronaut Space Station", "4DABF7")}

Being an astronaut is cool, but also WEIRD. In space, there's no gravity, so everything floats!

## Daily Challenges

### 🍕 Eating in Space
*   No crumbs! They float everywhere and can damage equipment
*   Food comes in pouches - you squeeze it into your mouth
*   Tortillas instead of bread (less crumby!)

### 😴 Sleeping in Space
*   You sleep in a sleeping bag attached to the wall
*   Without gravity, you can sleep any direction
*   Eye masks needed - the sun rises every 90 minutes!

### 🏋️ Exercise is REQUIRED
*   Your muscles get weak without gravity
*   Astronauts exercise 2 hours every day
*   Special machines keep their bones strong

${getImg("Space Food", "51CF66")}

> **🚽 Fun Fact:** Space toilets use a vacuum like a shop-vac to suck waste away! It costs $19 million to build.

## The View

Astronauts say looking at Earth from space changes you forever. It's called the "Overview Effect" - seeing how small and precious our planet is.
`,
                duration: 8,
                quiz: [
                    {
                        question: "Why do astronauts avoid bread in space?",
                        options: ["Allergies", "Too heavy", "Crumbs float and damage equipment", "It tastes bad"],
                        correctAnswer: 2,
                        explanation: "Floating crumbs can get into equipment or astronauts' eyes and lungs!"
                    },
                    {
                        question: "How often does the sun rise on the ISS?",
                        options: ["Once a day", "Every 90 minutes", "Once a week", "It's always dark"],
                        correctAnswer: 1,
                        explanation: "The Space Station orbits Earth every 90 minutes, so astronauts see 16 sunrises daily!"
                    },
                    {
                        question: "Why must astronauts exercise daily?",
                        options: ["To lose weight", "To stay entertained", "To prevent muscle and bone loss", "It's a competition"],
                        correctAnswer: 2,
                        explanation: "Without gravity, muscles and bones weaken quickly. Exercise keeps them healthy."
                    }
                ]
            },
            {
                id: "space_4",
                title: "Colonizing Mars",
                content: `
# The Red Planet Colony

${getImg("Mars Colony Habitat", "FF6B6B")}

Humans want to live on Mars! But it won't be easy. Let's plan our Martian home.

## Mars Challenges

### Problem 1: No Air 🌬️
*   Mars has almost no oxygen
*   **Solution**: Domed habitats with filtered air, or underground bases

### Problem 2: Deadly Cold 🥶
*   Average temperature: -80°F (-62°C)
*   **Solution**: Insulated habitats, nuclear power for heating

### Problem 3: No Water 💧
*   Liquid water can't exist on the surface
*   **Solution**: Extract water from ice at the poles

### Problem 4: Radiation ☢️
*   No magnetic field = harmful solar radiation
*   **Solution**: Underground living, radiation shields

${getImg("Mars Farming Dome", "51CF66")}

## Growing Food on Mars

> **🥔 Space Farmer:** We'd grow potatoes, lettuce, and beans in special greenhouses using Martian soil!

## The Journey There
*   **Distance**: 140 million miles (when closest)
*   **Travel time**: 6-9 months
*   **First humans on Mars**: Maybe by 2040!

${getImg("SpaceX Starship Mars", "339AF0")}
`,
                duration: 10,
                quiz: [
                    {
                        question: "What's the biggest challenge on Mars?",
                        options: ["Too many aliens", "No breathable air", "Too much rain", "High gravity"],
                        correctAnswer: 1,
                        explanation: "Mars has 95% carbon dioxide and almost no oxygen - we can't breathe it!"
                    },
                    {
                        question: "How long does it take to reach Mars?",
                        options: ["1 week", "1 month", "6-9 months", "10 years"],
                        correctAnswer: 2,
                        explanation: "Even at high speeds, the distance makes it a long journey."
                    },
                    {
                        question: "Where could we find water on Mars?",
                        options: ["In rivers", "At the ice poles", "In clouds", "In the ocean"],
                        correctAnswer: 1,
                        explanation: "Mars has water ice at its polar caps that could be extracted."
                    },
                    {
                        question: "Why would we live underground on Mars?",
                        options: ["It's cooler", "Protection from radiation", "Aliens live above", "More room"],
                        correctAnswer: 1,
                        explanation: "Mars has no magnetic field to block harmful solar radiation."
                    }
                ]
            }
        ]
    },
    "superheroes": {
        title: "Superhero Science Academy",
        description: "Uncover the real-world physics, biology, and chemistry behind your favorite superpowers.",
        learningObjectives: [
            "Analyze the physics of flight and strength",
            "Explore animal adaptations that look like superpowers",
            "Understanding genetics and mutation",
            "Learn about real-life superhumans"
        ],
        lessons: [
            {
                id: "hero_1",
                title: "Super Strength in Nature",
                content: `
# Stronger Than Steel?

In comic books, heroes lift cars. In nature, some animals are even stronger (for their size)!

${getImg("Ant Lifting Leaf", "51CF66")}

## The Mighty Ant
An ant can lift **50 times its own body weight**.
*   If you were as strong as an ant, you could lift a **pickup truck** over your head!

## The Spider's Silk
Spider silk is one of the strongest materials on Earth.
*   It is **5 times stronger than steel** of the same thickness.
*   Scientists are trying to copy it to make super-strong clothes!

> **💪 Hero Math:** If Spiderman's web was as thick as a pencil, it could stop a Boeing 747 in mid-air!
`,
                duration: 6,
                quiz: [
                    {
                        question: "Which material is stronger than steel?",
                        options: ["Cotton", "Spider Silk", "Rubber", "Paper"],
                        correctAnswer: 1,
                        explanation: "Spider silk has incredibly high tensile strength."
                    },
                    {
                        question: "How much can an ant lift?",
                        options: ["Full car", "50x its body weight", "10x its body weight", "Nothing"],
                        correctAnswer: 1,
                        explanation: "Ants have amazing muscle density for their small size."
                    },
                    {
                        question: "What relies on surface area to stick to walls?",
                        options: ["Geckos", "Lions", "Eagles", "Sharks"],
                        correctAnswer: 0,
                        explanation: "Geckos use microscopic hairs to stick to surfaces using Van der Waals forces."
                    }
                ]
            },
            {
                id: "hero_2",
                title: "The Science of Flight",
                content: `
# Up, Up, and Away!

${getImg("Superman Flying", "4DABF7")}

How could a human fly like Superman? Let's explore the physics!

## The Problem with Human Flight

### Weight vs. Lift
*   A 150-pound human would need wings 22 feet wide!
*   We'd also need massive chest muscles to flap them

### Real Flying Humans
*   **Wingsuits**: Glide at 120 mph using fabric between arms and legs
*   **Jet Packs**: Use thrust like rockets (but only last 10 minutes)
*   **Iron Man Suit**: Being developed by the military!

${getImg("Wingsuit Flying", "339AF0")}

## Animals That Fly

> **🦇 Echo Location:** Bats fly in complete darkness using sound waves - like Daredevil!

### Flying Styles:
*   **Flapping**: Birds, bats, insects
*   **Gliding**: Flying squirrels, flying fish
*   **Soaring**: Eagles use rising hot air
`,
                duration: 7,
                quiz: [
                    {
                        question: "How wide would human wings need to be?",
                        options: ["5 feet", "10 feet", "22 feet", "2 feet"],
                        correctAnswer: 2,
                        explanation: "We're too heavy! Birds have hollow bones and are much lighter."
                    },
                    {
                        question: "What technology lets humans fly today?",
                        options: ["Teleportation", "Jet packs and wingsuits", "Magic carpets", "Telekinesis"],
                        correctAnswer: 1,
                        explanation: "Wingsuits for gliding and jet packs for powered flight exist today!"
                    },
                    {
                        question: "How do bats navigate in the dark?",
                        options: ["Night vision", "Echo location (sound)", "Smell", "They can't"],
                        correctAnswer: 1,
                        explanation: "Bats emit high-pitched sounds and listen for echoes to 'see' their surroundings."
                    }
                ]
            },
            {
                id: "hero_3",
                title: "Mutation & Super Genes",
                content: `
# Born Different: Mutations

${getImg("DNA Double Helix", "BE4BDB")}

In X-Men, mutants have special powers from their genes. Is this possible in real life?

## What is a Mutation?
A mutation is a change in your DNA - the instruction book for your body.

*   Most mutations do nothing
*   Some cause problems
*   A few give you... advantages!

## Real-Life Super Mutations

### 🏃 Super Endurance
*   Some people have a mutation in the EPO gene
*   They produce more red blood cells
*   Result: Olympic-level stamina without training!

### 💪 Super Muscles
*   A mutation in the myostatin gene = double the muscle
*   This has been found in some children and animals (like Belgian Blue cattle)

### 🦴 Unbreakable Bones
*   LRP5 mutation makes bones 8x denser than normal
*   These people have never broken a bone!

${getImg("Superhuman Athlete", "FF6B6B")}

> **🧬 Fun Fact:** We ALL have about 100 new mutations that our parents didn't have!
`,
                duration: 9,
                quiz: [
                    {
                        question: "What is a mutation?",
                        options: ["A disease", "A change in DNA", "A superpower", "A type of exercise"],
                        correctAnswer: 1,
                        explanation: "Mutations are changes in the genetic code that can have various effects."
                    },
                    {
                        question: "Which mutation gives super-dense bones?",
                        options: ["EPO gene", "Myostatin gene", "LRP5 gene", "BRCA gene"],
                        correctAnswer: 2,
                        explanation: "People with LRP5 mutations have bones 8x stronger than normal."
                    },
                    {
                        question: "How many new mutations does each person have?",
                        options: ["0", "About 100", "Exactly 10", "Millions"],
                        correctAnswer: 1,
                        explanation: "Each person has roughly 100 mutations unique to them."
                    }
                ]
            },
            {
                id: "hero_4",
                title: "Real-Life Superhumans",
                content: `
# People with Amazing Abilities

${getImg("Human Echolocation Blind", "FCC419")}

Some people develop abilities that seem superhuman - through training, mutation, or adaptation!

## The Real Daredevil: Daniel Kish

Daniel lost his sight as a baby, but learned to **click his tongue** and listen to echoes.
*   He can ride a bike, hike, and navigate cities
*   His brain rewired to process sound like sight
*   It's called **Human Echolocation**!

## The Ice Man: Wim Hof

Wim can survive extreme cold that would kill most people.
*   He climbed Mt. Everest in shorts!
*   He swam under ice for 66 meters
*   His technique: Breathing exercises + mental focus

${getImg("Wim Hof Ice", "4DABF7")}

## Super Memory: Marilu Henner

Marilu remembers every day of her life in perfect detail.
*   Only about 100 people in the world have this
*   It's called **Highly Superior Autobiographical Memory (HSAM)**

## The Lesson?

> **🦸 You Are Amazing:** Your brain can adapt to almost anything. With practice, humans can do incredible things!
`,
                duration: 8,
                quiz: [
                    {
                        question: "How does Daniel Kish 'see' without eyes?",
                        options: ["Telepathy", "Echolocation with tongue clicks", "Smell", "Touch only"],
                        correctAnswer: 1,
                        explanation: "He clicks his tongue and listens to how sound bounces off objects!"
                    },
                    {
                        question: "What can Wim Hof survive?",
                        options: ["Fire", "Extreme cold", "High speed", "Electricity"],
                        correctAnswer: 1,
                        explanation: "Through special breathing, he can control his body temperature."
                    },
                    {
                        question: "What is HSAM?",
                        options: ["Super strength", "Super speed", "Super memory", "Super vision"],
                        correctAnswer: 2,
                        explanation: "Highly Superior Autobiographical Memory lets people remember every day of their lives."
                    },
                    {
                        question: "What's the lesson from these real superhumans?",
                        options: ["Only special people can do things", "The brain can adapt amazingly", "You need mutations", "It's all luck"],
                        correctAnswer: 1,
                        explanation: "The human brain is incredibly adaptable - practice can achieve amazing results!"
                    }
                ]
            }
        ]
    },
    "ocean life": {
        title: "Deep Sea Expedition",
        description: "Dive into the abyss! Explore coral reefs, meet glowing deep-sea creatures, and learn about marine biology.",
        learningObjectives: [
            "Identify layers of the ocean",
            "Understand bioluminescence (glowing animals)",
            "Learn about the oceanic food chain",
            "Discover coral reef ecosystems"
        ],
        lessons: [
            {
                id: "ocean_1",
                title: "The Zones of the Ocean",
                content: `
# Going Down! 🌊

The ocean is deep. Like, REALLY deep. Scientists divide it into zones.

${getImg("Ocean Depth Zones Diagram", "4DABF7")}

## 1. Sunlight Zone (Surface to 200m)
*   **Light**: Lots of sun! ☀️
*   **Life**: Sharks, sea turtles, dolphins, clownfish.
*   **Plants**: Seaweed and coral reefs grow here.

## 2. Twilight Zone (200m to 1000m)
*   **Light**: Very dim blue light.
*   **Life**: Sperm whales hunt giant squid here. Animals have big eyes to see in the dark.

## 3. Midnight Zone (Deep!)
*   **Light**: Pitch black. ⚫
*   **Life**: Anglerfish with glowing lures! This is called **Bioluminescence**.

> **🔦 Glowing Fact:** 90% of animals in the deep ocean can make their own light to communicate or attract food.
`,
                duration: 6,
                quiz: [
                    {
                        question: "Which zone has the most plants?",
                        options: ["Midnight Zone", "Twilight Zone", "Sunlight Zone", "Abyss"],
                        correctAnswer: 2,
                        explanation: "Plants need sunlight for photosynthesis, so they only live at the top."
                    },
                    {
                        question: "What is it called when animals make light?",
                        options: ["Photosynthesis", "Bioluminescence", "Electric Shock", "Radiation"],
                        correctAnswer: 1,
                        explanation: "Bio (Life) + Luminescence (Light). Fireflies do this too!"
                    },
                    {
                        question: "Why do deep sea animals have big eyes?",
                        options: ["To look scary", "To see in very dim light", "To sleep better", "They don't"],
                        correctAnswer: 1,
                        explanation: "Large eyes capture as much of the tiny amount of available light as possible."
                    }
                ]
            },
            {
                id: "ocean_2",
                title: "Coral Reef Cities",
                content: `
# The Rainforests of the Sea

${getImg("Coral Reef Colorful Fish", "FF6B6B")}

Coral reefs are underwater cities teeming with life! They cover less than 1% of the ocean but support 25% of all marine species.

## What is Coral?

Coral looks like a rock or plant, but it's actually **tiny animals** called polyps!
*   Millions of polyps build the reef together
*   They work with algae that live inside them
*   The algae give coral its beautiful colors

## The Reef Food Web

${getImg("Clownfish Anemone", "FCC419")}

### Producers
*   Algae and seaweed make food from sunlight

### Consumers
*   **Herbivores**: Parrotfish eat algae off coral
*   **Carnivores**: Moray eels hunt fish
*   **Top Predators**: Reef sharks keep everything balanced

> **🐠 Symbiosis:** Clownfish live in poisonous anemones - they're immune! The clownfish get protection, the anemone gets cleaned.

## Threats to Coral

*   **Warming water** causes coral to bleach (lose color and die)
*   **Pollution** blocks sunlight
*   We must protect these amazing ecosystems!
`,
                duration: 8,
                quiz: [
                    {
                        question: "What is coral made of?",
                        options: ["Rock", "Plants", "Tiny animals (polyps)", "Sand"],
                        correctAnswer: 2,
                        explanation: "Coral polyps are small animals that build hard skeletons over time."
                    },
                    {
                        question: "What gives coral its color?",
                        options: ["Paint", "Algae living inside", "Chemicals", "Light reflection"],
                        correctAnswer: 1,
                        explanation: "Symbiotic algae provide nutrients and color to coral."
                    },
                    {
                        question: "What's the relationship between clownfish and anemones?",
                        options: ["Enemies", "Symbiosis (helping each other)", "Parent and child", "Random"],
                        correctAnswer: 1,
                        explanation: "Both benefit - clownfish get protection, anemones get cleaned and defended."
                    }
                ]
            },
            {
                id: "ocean_3",
                title: "Giants of the Deep",
                content: `
# The Biggest Creatures Ever

${getImg("Blue Whale", "4DABF7")}

Some ocean animals are absolutely MASSIVE. Let's meet the giants!

## The Blue Whale

The largest animal to EVER exist - bigger than any dinosaur!

*   **Length**: 100 feet (as long as 3 school buses)
*   **Weight**: 200 tons (as heavy as 30 elephants)
*   **Heart**: Size of a small car
*   **Diet**: Tiny shrimp called krill (4 tons per day!)

## The Giant Squid

${getImg("Giant Squid", "BE4BDB")}

For centuries, sailors told tales of sea monsters. They were real!

*   **Length**: Up to 43 feet
*   **Eyes**: The size of dinner plates
*   **Enemy**: Sperm whales dive deep to hunt them

## The Ocean Sunfish (Mola Mola)

${getImg("Ocean Sunfish Mola", "FCC419")}

The heaviest bony fish in the world!

*   **Weight**: Up to 5,000 pounds
*   **Shape**: Looks like a giant swimming head
*   **Food**: Jellyfish (it eats them by the hundreds)

> **🐋 Whale Song:** Blue whales communicate with sounds so loud they can be heard 1,000 miles away!
`,
                duration: 7,
                quiz: [
                    {
                        question: "What's the largest animal ever?",
                        options: ["T-Rex", "Elephant", "Blue Whale", "Great White Shark"],
                        correctAnswer: 2,
                        explanation: "Blue whales are larger than any dinosaur that ever lived!"
                    },
                    {
                        question: "What do blue whales eat?",
                        options: ["Fish", "Seals", "Tiny krill", "Coral"],
                        correctAnswer: 2,
                        explanation: "Despite their size, they eat tiny shrimp-like animals called krill."
                    },
                    {
                        question: "How big are giant squid eyes?",
                        options: ["Size of a grape", "Size of a coin", "Size of a dinner plate", "They have no eyes"],
                        correctAnswer: 2,
                        explanation: "The largest eyes in the animal kingdom help them see in dark depths."
                    }
                ]
            },
            {
                id: "ocean_4",
                title: "Ocean Explorers & Technology",
                content: `
# Exploring the Final Frontier

${getImg("Submarine Deep Sea", "339AF0")}

We've explored more of the moon than the deep ocean! Here's how scientists are changing that.

## Submarine Technology

### 1. Alvin (Famous Sub)
*   First to explore the Titanic wreck
*   Can dive to 14,700 feet
*   Holds 3 people for up to 10 hours

### 2. ROVs (Remote Operated Vehicles)
*   No humans needed - controlled by cable
*   Can go deeper and stay longer
*   Cameras capture amazing footage

${getImg("ROV Underwater Robot", "51CF66")}

## Deep Sea Discoveries

> **🌋 Hydrothermal Vents:** In 1977, scientists discovered volcanic vents on the ocean floor with life surviving in boiling water!

### Amazing Finds:
*   New species discovered every year
*   Life in extreme conditions (no sunlight, intense pressure)
*   Ancient shipwrecks preserved in cold water

## The Deepest Point: Challenger Deep

The Mariana Trench is 36,000 feet deep - Mount Everest could fit inside!
*   **Pressure**: 1,000x the surface
*   **First visitor**: Jacques Piccard (1960)
*   **Latest explorer**: James Cameron (the movie director!)

${getImg("Mariana Trench", "4DABF7")}
`,
                duration: 9,
                quiz: [
                    {
                        question: "What is an ROV?",
                        options: ["A type of fish", "A Remote Operated Vehicle", "A diving suit", "A coral species"],
                        correctAnswer: 1,
                        explanation: "ROVs are robots that can explore where humans can't go."
                    },
                    {
                        question: "What's special about hydrothermal vents?",
                        options: ["They're cold", "Life exists in boiling water there", "They have treasure", "Nothing lives there"],
                        correctAnswer: 1,
                        explanation: "These volcanic vents host unique ecosystems powered by chemical energy, not sunlight!"
                    },
                    {
                        question: "How deep is the Mariana Trench?",
                        options: ["1,000 feet", "10,000 feet", "36,000 feet", "100 feet"],
                        correctAnswer: 2,
                        explanation: "It's the deepest known point in the ocean - almost 7 miles down!"
                    },
                    {
                        question: "Who explored the deepest ocean in 2012?",
                        options: ["Neil Armstrong", "Elon Musk", "James Cameron", "Jacques Cousteau"],
                        correctAnswer: 2,
                        explanation: "The Titanic director solo-dived to the bottom of Challenger Deep!"
                    }
                ]
            }
        ]
    },
    "coding": {
        title: "Code Quest: Learn to Program",
        description: "Write your first lines of code! Learn logic, loops, and create your own simple programs.",
        learningObjectives: [
            "Understand what code is and how computers think",
            "Learn about variables and data types",
            "Master loops and conditional logic",
            "Build simple interactive programs"
        ],
        lessons: [
            {
                id: "code_1",
                title: "What is Code?",
                content: `
# Speaking Computer Language

${getImg("Computer Code Screen", "339AF0")}

Computers are powerful but DUMB. They do exactly what you tell them - no more, no less!

## Code = Instructions

Think of code like a recipe:
*   Step 1: Crack 2 eggs
*   Step 2: Add flour
*   Step 3: Mix well

If you skip a step or do it wrong, you get a mess! Computers are the same.

## Programming Languages

Just like humans have English, Spanish, and Japanese, computers have different languages:

*   **Python** 🐍: Great for beginners, used in AI
*   **JavaScript**: Makes websites interactive
*   **Scratch**: Visual blocks for kids
*   **C++**: Powerful, used in games

${getImg("Python Programming", "51CF66")}

> **💡 First Programmer:** Ada Lovelace wrote the first computer program in 1843 - before computers even existed!

## Your First Code

\`\`\`python
print("Hello, World!")
\`\`\`

This tells the computer to display "Hello, World!" on screen. Simple, right?
`,
                duration: 7,
                quiz: [
                    {
                        question: "What is code?",
                        options: ["Secret spy language", "Instructions for computers", "A type of puzzle", "Math homework"],
                        correctAnswer: 1,
                        explanation: "Code tells computers exactly what to do, step by step."
                    },
                    {
                        question: "Which language is best for beginners?",
                        options: ["C++", "Assembly", "Python", "Machine Code"],
                        correctAnswer: 2,
                        explanation: "Python is designed to be readable and beginner-friendly."
                    },
                    {
                        question: "Who was the first programmer?",
                        options: ["Bill Gates", "Ada Lovelace", "Steve Jobs", "Albert Einstein"],
                        correctAnswer: 1,
                        explanation: "Ada Lovelace wrote the first algorithm for a machine in 1843!"
                    }
                ]
            },
            {
                id: "code_2",
                title: "Variables: Storing Information",
                content: `
# Boxes for Your Data

${getImg("Storage Boxes Labeled", "FCC419")}

Imagine you have labeled boxes to store things. That's what **variables** are in coding!

## Creating Variables

\`\`\`python
name = "Alex"
age = 12
high_score = 9500
\`\`\`

Now the computer remembers:
*   **name** contains "Alex"
*   **age** contains 12
*   **high_score** contains 9500

## Data Types

Different boxes hold different things:

| Type | Example | What it holds |
|------|---------|---------------|
| String | "Hello" | Text (in quotes) |
| Integer | 42 | Whole numbers |
| Float | 3.14 | Decimal numbers |
| Boolean | True | True or False |

${getImg("Data Types Diagram", "BE4BDB")}

> **🎮 Game Example:** In a video game, your health might be stored as: \`health = 100\`

## Changing Variables

\`\`\`python
score = 0
score = score + 10  # Now score is 10!
\`\`\`

Variables can change - that's why they're called *variables*!
`,
                duration: 8,
                quiz: [
                    {
                        question: "What is a variable?",
                        options: ["A type of computer", "A container for storing data", "A bug in code", "A programming language"],
                        correctAnswer: 1,
                        explanation: "Variables store information that your program can use and change."
                    },
                    {
                        question: "What data type is 'Hello World'?",
                        options: ["Integer", "Float", "String", "Boolean"],
                        correctAnswer: 2,
                        explanation: "Text in quotes is called a String."
                    },
                    {
                        question: "What data type is True or False?",
                        options: ["String", "Integer", "Float", "Boolean"],
                        correctAnswer: 3,
                        explanation: "Booleans can only be True or False - like a light switch!"
                    }
                ]
            },
            {
                id: "code_3",
                title: "If-Then: Making Decisions",
                content: `
# Teaching Computers to Choose

${getImg("Crossroads Decision", "FF6B6B")}

Computers can make decisions... if you tell them how!

## The IF Statement

\`\`\`python
age = 15

if age >= 13:
    print("You can watch this movie!")
else:
    print("Sorry, you're too young.")
\`\`\`

This checks: "Is age 13 or more?" and responds accordingly!

## Comparison Operators

| Symbol | Meaning |
|--------|---------|
| == | Equals |
| != | Not equals |
| > | Greater than |
| < | Less than |
| >= | Greater or equal |
| <= | Less or equal |

## Real Game Example

\`\`\`python
health = 20

if health <= 0:
    print("💀 Game Over!")
elif health < 30:
    print("⚠️ Warning: Low health!")
else:
    print("💚 You're doing great!")
\`\`\`

${getImg("Video Game Health Bar", "51CF66")}

> **🎯 Challenge:** Think of a game decision: "IF player touches coin, THEN add 100 points"
`,
                duration: 9,
                quiz: [
                    {
                        question: "What does the IF statement do?",
                        options: ["Makes loops", "Makes decisions based on conditions", "Stores data", "Draws graphics"],
                        correctAnswer: 1,
                        explanation: "IF checks a condition and runs different code based on the result."
                    },
                    {
                        question: "What does == mean?",
                        options: ["Assign value", "Check if equal", "Add numbers", "Subtract numbers"],
                        correctAnswer: 1,
                        explanation: "Double equals checks if two things are the same."
                    },
                    {
                        question: "What does ELIF mean?",
                        options: ["Error", "Else If (another condition)", "End Loop", "Equal If"],
                        correctAnswer: 1,
                        explanation: "ELIF lets you check multiple conditions in order."
                    }
                ]
            },
            {
                id: "code_4",
                title: "Loops: Repeat Yourself",
                content: `
# Don't Type It a Million Times!

${getImg("Hamster Wheel Running", "FCC419")}

What if you want to do something 100 times? Loops to the rescue!

## The FOR Loop

\`\`\`python
for i in range(5):
    print("Hello!")
\`\`\`

Output:
\`\`\`
Hello!
Hello!
Hello!
Hello!
Hello!
\`\`\`

## The WHILE Loop

\`\`\`python
countdown = 5

while countdown > 0:
    print(countdown)
    countdown = countdown - 1

print("🚀 Liftoff!")
\`\`\`

Output:
\`\`\`
5
4
3
2
1
🚀 Liftoff!
\`\`\`

${getImg("Rocket Countdown", "FF6B6B")}

## Game Loops

Every video game uses a loop that runs forever:

\`\`\`python
while game_running:
    check_player_input()
    update_game_world()
    draw_screen()
\`\`\`

> **♾️ Infinite Loop:** Be careful! A loop that never stops will crash your program: \`while True:\`

## Combining It All!

\`\`\`python
for enemy in enemies:
    if enemy.health <= 0:
        print("Enemy defeated!")
        score = score + 100
\`\`\`
`,
                duration: 10,
                quiz: [
                    {
                        question: "What does a loop do?",
                        options: ["Stops the program", "Repeats code multiple times", "Deletes files", "Changes colors"],
                        correctAnswer: 1,
                        explanation: "Loops run the same code over and over until a condition is met."
                    },
                    {
                        question: "What's the difference between FOR and WHILE?",
                        options: ["Nothing", "FOR runs a set number, WHILE runs until condition is false", "WHILE is faster", "FOR is newer"],
                        correctAnswer: 1,
                        explanation: "FOR loops run a specific number of times; WHILE loops run until something changes."
                    },
                    {
                        question: "What happens if a loop never ends?",
                        options: ["Nothing", "The program runs perfectly", "The program freezes/crashes", "It runs faster"],
                        correctAnswer: 2,
                        explanation: "An infinite loop will freeze your program because it never stops!"
                    },
                    {
                        question: "What runs inside every video game?",
                        options: ["A database", "A game loop", "A website", "An email"],
                        correctAnswer: 1,
                        explanation: "Games constantly loop: check input → update world → draw screen → repeat!"
                    }
                ]
            }
        ]
    }
};
