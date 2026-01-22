import { GeneratedCourse } from "./ai";

// Helper to generate dynamic images (Primary: Unsplash, Fallback handled in UI component)
const getImg = (text: string, color: string = "ignored") =>
    `![${text}](https://source.unsplash.com/800x400/?${encodeURIComponent(text)})`;

export const fallbackCourses: Record<string, GeneratedCourse> = {
    "dinosaurs": {
        title: "Dino Discovery: Giants of the Past",
        description: "Travel back 65 million years to roam with the T-Rex, soar with Pterodactyls, and dig up ancient secrets.",
        learningObjectives: [
            "Identify major dinosaur groups (Carnivores vs Herbivores)",
            "Understand the fossilization process",
            "Explore theories about dinosaur extinction"
        ],
        lessons: [
            {
                id: "dino_1",
                title: "Kings of the Cretaceous",
                content: `
# Meet the Titans

${getImg("Tyrannosaurus Rex", "FF6B6B")}

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
            }
        ]
    },
    "space travel": {
        title: "Mission to Mars: Space Explorer",
        description: "Launch your own rocket, navigate the solar system, and plan the first human colony on Mars.",
        learningObjectives: [
            "Understand the physics of rockets (Newton's Laws)",
            "Map the planets of the Solar System",
            "Design a habitat for living on Mars"
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
            }
        ]
    },
    "superheroes": {
        title: "Superhero Science Academy",
        description: "Uncover the real-world physics, biology, and chemistry behind your favorite superpowers.",
        learningObjectives: [
            "Analyze the physics of flight and strength",
            "Explore animal adaptations that look like superpowers",
            "Understanding genetics and mutation"
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
            }
        ]
    },
    "magic tricks": {
        title: "Hogwarts of Illusions",
        description: "Master the art of magic. Learn card tricks, mind reading, and the psychology behind grand illusions.",
        learningObjectives: [
            "Master the 'French Drop' coin vanish",
            "Understand the psychology of misdirection",
            "Perform a self-working card trick"
        ],
        lessons: [
            {
                id: "magic_1",
                title: "The Art of Misdirection",
                content: `
# Look Over There! 👉

Magic isn't real spells; it's **psychology**. The most important skill is *Misdirection*.

${getImg("Magician Hands", "9775FA")}

## How it Works
Your brain can only focus on one thing at a time.
*   If the magician looks at his left hand, **YOU** look at his left hand.
*   Meanwhile, his right hand is doing the secret move!

### Try This: The Coin Vanish
1.  Hold a coin in your right hand.
2.  Pretend to grab it with your left hand.
3.  **Keep your eyes on your left hand** (even though it's empty).
4.  Your audience will believe the coin is in the left hand because **you** believe it.

> **🎩 Professional Secret:** "Never tell the audience what you are going to do before you do it!"
`,
                duration: 8,
                quiz: [
                    {
                        question: "What is misdirection?",
                        options: ["Using smoke", "Controlling audience attention", "Moving fast", "Lying"],
                        correctAnswer: 1,
                        explanation: "It guides the audience's eyes away from the secret method."
                    },
                    {
                        question: "Where should the magician look?",
                        options: ["Where they want the audience to look", "At the floor", "At their feet", "Eyes closed"],
                        correctAnswer: 0,
                        explanation: "The audience's gaze naturally follows the magician's gaze."
                    },
                    {
                        question: "Why shouldn't you explain the trick first?",
                        options: ["It's boring", "They will look for the secret", "It takes too long", "You might forget"],
                        correctAnswer: 1,
                        explanation: "If they know what's coming, they know where to look to spot the trick!"
                    }
                ]
            }
        ]
    },
    "ocean life": {
        title: "Deep Sea Expedition",
        description: "Dive into the abyss! explore coral reefs, meet glowing deep-sea creatures, and learn about marine biology.",
        learningObjectives: [
            "Identify layers of the ocean",
            "Understand bioluminescence (glowing animals)",
            "Learn about the oceanic food chain"
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
            }
        ]
    },
    "video game design": {
        title: "Game Dev: Pixel Power",
        description: "Go behind the scenes of your favorite games. Learn logic, level design, and what makes a game fun.",
        learningObjectives: [
            "Understand the 'Game Loop'",
            "Differentiate between Sprites and Models",
            "Learn basic condition logic (If/Then)"
        ],
        lessons: [
            {
                id: "game_1",
                title: "The Rules of the Game",
                content: `
# Thinking Like a Coder 💻

Video games are just big sets of instructions. Computers are smart, but they need to be told EXACTLY what to do.

${getImg("Game Logic Flowchart", "BE4BDB")}

## If... Then... Else
This is the most important logic in gaming.
*   **IF** player presses [SPACE] -> **THEN** Jump.
*   **IF** player touches [LAVA] -> **THEN** Game Over.
*   **IF** coin count = 100 -> **THEN** Extra Life.

## The Game Loop
A game runs in a super fast circle, 60 times every second!
1.  **Check Input**: Did you press a button?
2.  **Update**: Move the character.
3.  **Draw**: Show the new picture on screen.
4.  *Repeat!*

> **👾 Glitch Hunt:** A 'Bug' is when the logic goes wrong. Like walking through a wall because the code forgot to say "Stop!"
`,
                duration: 7,
                quiz: [
                    {
                        question: "What happens in the 'Draw' phase?",
                        options: ["Computer turns off", "Sound plays", "Screen updates with new image", "Game saves"],
                        correctAnswer: 2,
                        explanation: "The computer draws the current state of the game world to your monitor."
                    },
                    {
                        question: "What logic would you use for a jump button?",
                        options: ["If button pressed, go down", "If button pressed, go up", "If button pressed, explode", "Random check"],
                        correctAnswer: 1,
                        explanation: "IF input detected, THEN apply upward velocity."
                    },
                    {
                        question: "What is an NPC?",
                        options: ["Non-Player Character", "Nice Pizza Crust", "No Player Can", "New Power Cell"],
                        correctAnswer: 0,
                        explanation: "Characters controlled by the computer code, not by a human."
                    }
                ]
            }
        ]
    },
    "robots": {
        title: "Robotics 101: Beep Boop",
        description: "From Mars rovers to helpful home assistants. Learn how robots sense, think, and act.",
        learningObjectives: [
            "Identify the 3 parts of a robot (Sensors, Processor, Actuators)",
            "Understand how robots 'see'",
            "Explore use cases for robots"
        ],
        lessons: [
            {
                id: "robot_1",
                title: "What Makes a Robot?",
                content: `
# Anatomy of a Robot 🤖

Robots are a lot like humans! They have body parts that do specific jobs.

${getImg("Robot Parts Diagram", "868e96")}

## 1. Sensors (The Eyes & Ears)
Robots need to know what's around them.
*   **Cameras**: To see objects.
*   **Lidar**: To measure distance structure (like laser radar!).
*   **Microphones**: To hear commands.

## 2. Processor (The Brain)
A computer chip that takes the sensor info and decides what to do.
*   *"I see a wall (Sensor) -> I should stop (Brain)."*

## 3. Actuators (The Muscles)
Motors and pistons that make the robot move.
*   Wheels turning, arms lifting, or grippers pinching.

> **🧹 Home Bots:** Robot vacuums use bump sensors. When they hit a wall, the 'Brain' tells the 'Wheels' to turn around!
`,
                duration: 6,
                quiz: [
                    {
                        question: "Which part acts as the robot's brain?",
                        options: ["Battery", "Processor", "Wheel", "Camera"],
                        correctAnswer: 1,
                        explanation: "The processor (CPU) runs the code and makes decisions."
                    },
                    {
                        question: "What does a Lidar sensor do?",
                        options: ["Smells food", "Measures distance with lasers", "Tastes water", "Plays music"],
                        correctAnswer: 1,
                        explanation: "Lidar bounces light off objects to create a 3D map of the world."
                    },
                    {
                        question: "What part helps a robot move?",
                        options: ["Actuators/Motors", "Sensors", "Wires", "Paint"],
                        correctAnswer: 0,
                        explanation: "Actuators convert energy into motion."
                    }
                ]
            }
        ]
    },
    "ancient egypt": {
        title: "Pyramids & Pharaohs",
        description: "Walk like an Egyptian! Decipher hieroglyphs, build pyramids, and learn about mummies.",
        learningObjectives: [
            "Understand the importance of the Nile River",
            "Learn how Pyramids were built",
            "Decode basic Hieroglyphs"
        ],
        lessons: [
            {
                id: "egypt_1",
                title: "Life by the Nile",
                content: `
# The Gift of the Nile 🐊

Egypt is mostly specific desert sand. So how did a huge civilization grow there? The answer is the **Nile River**.

${getImg("Nile River Map", "FCC419")}

## The Annual Flood
Every year, the Nile would flood. When the water went down, it left behind thick, black, rich mud.
*   This mud was perfect for farming!
*   Egyptians grew wheat for bread and flax for linen clothes.

## The Pharaoh
The King of Egypt was called the **Pharaoh**.
*   People believed the Pharaoh was half-human, half-god.
*   They wore a double crown to show they ruled both Upper and Lower Egypt.

> **🔺 Big Build:** The Great Pyramid of Giza took **20 years** and **100,000 workers** to build! It was the tallest building in the world for 3,800 years.
`,
                duration: 8,
                quiz: [
                    {
                        question: "Why was the Nile flood good?",
                        options: ["It washed the pyramids", "It left rich soil for farming", "It brought gold", "It filled swimming pools"],
                        correctAnswer: 1,
                        explanation: "The fertile silt (mud) allowed agriculture to flourish in the middle of a desert."
                    },
                    {
                        question: "What was the Egyptian king called?",
                        options: ["President", "Emperor", "Pharaoh", "Boss"],
                        correctAnswer: 2,
                        explanation: "Pharaoh means 'Great House', referring to the palace."
                    },
                    {
                        question: "What did Egyptians write with?",
                        options: ["Hieroglyphs", "English", "Emojis", "Latin"],
                        correctAnswer: 0,
                        explanation: "Hieroglyphs were picture-symbols used for formal writing."
                    }
                ]
            }
        ]
    },
    "detective skills": {
        title: "Top Secret Detective School",
        description: "Sharpen your observation skills. Learn fingerptinting, code-breaking, and deduction.",
        learningObjectives: [
            "Analyze fingerprints",
            "Learn deductive reasoning",
            "Crack basic secret codes"
        ],
        lessons: [
            {
                id: "detective_1",
                title: "The Art of Observation",
                content: `
# Nothing Escapes Your Eye 🔍

A detective doesn't just "see", they **observe**. They notice details others miss.

${getImg("Magnifying Glass & Clues", "FF6B6B")}

## Fingerprints: Nature's ID Card
Look at your fingertips. See those swirls?
*   **Loops**: Lines enter and exit the same side.
*   **Whorls**: Lines form a circle.
*   **Arches**: Lines go in one side and out the other.
*   **NO TWO PEOPLE** have the same print. Not even identical twins!

## Deductive Reasoning
Using clues to find the truth.
*   *Clue*: The grass is wet.
*   *Clue*: The sky is gray.
*   *Deduction*: It probably rained recently!

> **🕵️ Try It:** Walk into a room for 1 minute. Walk out. Write down everything you remember. blue rug? open window? 3 cups?
`,
                duration: 6,
                quiz: [
                    {
                        question: "Do identical twins have the same fingerprints?",
                        options: ["Yes", "No", "Sometimes", "Only on left hand"],
                        correctAnswer: 1,
                        explanation: "Fingerprints develop differently in the womb, making them unique to every human."
                    },
                    {
                        question: "What shape is a 'Whorl' fingerprint?",
                        options: ["A triangle", "A circle/spiral", "A straight line", "A square"],
                        correctAnswer: 1,
                        explanation: "Whorls look like bullseyes or spirals."
                    },
                    {
                        question: "What is Deduction?",
                        options: ["Guessing randomly", "Using facts to form a conclusion", "Asking a friend", "Giving up"],
                        correctAnswer: 1,
                        explanation: "Sherlock Holmes is famous for this style of logical thinking."
                    }
                ]
            }
        ]
    },
    "comic book writing": {
        title: "POW! Zap! Comic Creator",
        description: "From idea to ink. Create heroes, write speech bubbles, and layout dynamic pages.",
        learningObjectives: [
            "Understand story arcs (Beginning, Middle, End)",
            "Visual storytelling with panels",
            "Creating sound effects (Onomatopoeia)"
        ],
        lessons: [
            {
                id: "comic_1",
                title: "Heroes & Villains",
                content: `
# Creating a Character 🦸

Every story needs a star. But a hero is boring without a problem!

${getImg("Comic Book Layout", "FFD43B")}

## The Hero's Recipe
1.  **Look**: Cape? Mask? Robot armor? Silhouette matters!
2.  **Power**: Flight? Super smarts? Invisibility?
3.  **Weakness**: Kryptonite? Fear of spiders? Too trusting?
    *   *Weaknesses make characters interesting!*

## Onomatopoeia (Sound Words)
In comics, you have to **SEE** the sound.
*   **POW!** (Punch)
*   **SWISH!** (Cape moving)
*   **BOOM!** (Explosion)
*   **SNAP!** (Twig breaking)

> **💬 Speech Bubbles:** Round bubbles are for talking. Cloud bubbles are for thinking. Spiky bubbles are for SCREAMING!
`,
                duration: 6,
                quiz: [
                    {
                        question: "What makes a hero interesting?",
                        options: ["Being perfect", "Having a weakness or flaw", "Having cool shoes", "Always winning"],
                        correctAnswer: 1,
                        explanation: "Flaws make characters relatable and stories exciting. Will they overcome it?"
                    },
                    {
                        question: "What is a 'Spiky' speech bubble used for?",
                        options: ["Whispering", "Thinking", "Shouting/Loud noises", "Sleeping"],
                        correctAnswer: 2,
                        explanation: "The sharp edges show the sound is sharp and loud!"
                    },
                    {
                        question: "Which word is an Onomatopoeia?",
                        options: ["Table", "Green", "SPLASH!", "Fast"],
                        correctAnswer: 2,
                        explanation: "Splas describes the actual sound of water hitting something."
                    }
                ]
            }
        ]
    }
};
