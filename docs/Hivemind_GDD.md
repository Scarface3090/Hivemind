# Game Design Document: Hivemind
**Version:** 3.1 (Final)

## 1. Overview & Vision

* **Game Title:** Hivemind
* **Genre:** Social Guessing Game, Custom Reddit Post
* **Logline:** A social guessing game where one player challenges the Reddit community to read their mind, turning discussion and debate into points.
* **Target Audience:** General Reddit users in communities that enjoy discussion, debate, and light-hearted social games.
* **Core Vision:** To create a simple, elegant, and deeply "Reddit-native" game that fosters community interaction, clever thinking, and endless debate within a single post.

## 2. Guiding Principles & Architecture

* **Primary Principle: Mobile-First UX**
    * All design and interactions must be optimized for a vertical, single-column, touch-screen experience.
* **Design Pillars**
    * **Single Initiator, Community Play:** A single user can start a game instantly, with the entire community becoming their "opponent" and collaborator.
    * **Discussion as a Mechanic:** The scoring system is explicitly designed to reward persuasive and engaging commentary, making the comments section a core part of the game.
* **Technical Architecture: Devvit (React/Phaser + Express/Redis)**
    * The game is built on the Devvit platform. The backend is an Express server using Redis for data persistence. The frontend is a hybrid of React for the UI shell/components and Phaser for the core interactive game canvas. The client and server communicate via the `postMessage` API. The Host's identity is **visible** from the start of the game.

## 3. Core Gameplay Loop

The game operates on an asynchronous, Host-configurable timer.

1.  **Initiation:** A "Host" starts a new game, receiving a secret target on a dynamic spectrum.
2.  **The Clue & Duration:** The Host provides a single public clue and selects the round's duration.
3.  **Community Guessing:** For the duration of the round, Guessers find the game, see the clue and the **live Hivemind median**, drag the slider to make their guess, and write a justification.
4.  **The Reveal:** After the duration expires, the game reveals the Host's target, the final Hivemind median, scores, and custom stats. The **Host does not guess** in their own game.

## 4. Essential User Flows (Detailed)

* **Flow 0: The Home Screen**
    * A user opens the *Hivemind* custom post.
    * The UI presents two primary, distinct options: **"Host Game"** and **"Join Game."**

* **Flow 1: Hosting a New Game**
    * The user clicks "Host Game."
    * The system calls the backend to generate a draft, providing the user with a unique `spectrum` and a hidden `secretTarget`.
    * The UI displays the hosting interface.
    * The user inputs their `clue` into a text area.
    * The user selects a `duration` for the game from a predefined list (e.g., 1 hour, 3 hours, 6 hours, 24 hours).
    * The user clicks "Start Game," which sends the `draftId`, `clue`, and `duration` to the backend to publish the game.
    * The published game is made available as a custom post on the game sub reddit feed
    * The user is brought back to the home screen

* **Flow 2: Playing a Round as a Guesser**
    * **Discovery:** The player finds a game to play through one of two paths:
        * **Path A (Via Game Feed):** The user clicks "Join Game" on the Home Screen. The UI fetches and displays a list of currently active games as clickable cards. Each card shows the Host's `clue` and the remaining time. The user selects a game to enter.
        * **Path B (Via Reddit Feed):** The user is browsing Reddit and encounters a *Hivemind* game post. Clicking the post directly loads the game, taking them straight to the guessing view.
    * **Analysis:** The user is now in the guessing view.
        * The UI displays the Host's `clue` and the `spectrum`.
        * The UI displays the **current Hivemind median guess**, which is periodically updated from the backend.
    * **Submission:**
        * The user drags the slider in the Phaser canvas to their desired position (0-100).
        * The user types a `justification` into the React text area.
        * The user clicks "Submit." The guess value and justification are sent to the backend. The UI updates to confirm their guess is locked.

* **Flow 3: Viewing the Results**
    * A user navigates to a game post whose `endTime` has passed.
    * The backend automatically transitions the game's state to `REVEAL`.
    * The UI detects this state and renders the Results Interface.
    * The user sees a complete summary of the round, including all scores, stats, and accolades.

## 5. Game Mechanics & Systems (Detailed)

#### 5.1. Dynamic Content System

* **Purpose:** To ensure a constant stream of fresh, varied content for players.
* **Source:** A Google Sheet will act as a simple Content Management System (CMS). It will contain the following columns:
    * `Left_Label` (string)
    * `Right_Label` (string)
    * `Difficulty` (enum: `Low`, `Moderate`, `Hard`)
    * `Category` (enum: `movies`, `gaming`, `science`, `general`)
* **Execution:** The Devvit backend will fetch and cache the entire contents of this sheet on startup. When a Host requests a new game draft, the server will randomly select one row from the cache to serve as the game's spectrum.
* **Vertical Slice Note:** For the V1 slice, only `Left_Label` and `Right_Label` will be used by the game logic, but the system will be built to fetch all columns to support future features.

#### 5.2. Scoring System

* **Purpose:** To reward players for both skill and social engagement, creating multiple paths to victory and recognition.
* **Guesser's Total Score:** `Total Score = (Guessing Score) + (Persuasion Score)`
    * **Guessing Score:** `100 - |secretTarget - playerGuess|`. This is a direct measure of a player's ability to interpret the Host's clue.
    * **Persuasion Score:** `(Number of Upvotes on Justification Comment) * 2`. This directly rewards players for writing clever, funny, or persuasive justifications that resonate with the community. The multiplier (`2`) is a configurable value on the backend.
* **Host's Score:** `Host Score = (100 - |secretTarget - medianGuess|) + (Number of Participants)`. This formula rewards the Host for two distinct skills: **clarity** (how close the Hivemind got) and **engagement** (how many people their clue attracted).

#### 5.3. Live Median Calculation

* **Purpose:** To provide the "Social Strategy" context for players, allowing them to play with or against the crowd's current opinion.
* **Execution:** The backend will maintain a cached value for the current median of any active game. This cached value will be recalculated on a set interval (e.g., every 30 seconds) rather than on every single request, ensuring a balance between real-time feel and server performance. The `GET /api/games/:gameId` endpoint will always include this reasonably fresh median value.

#### 5.4. Results Screen & Social Payoff

* **Purpose:** To provide a rich, narrative summary of the round that is more engaging than a simple score report.
* **Components:** The results screen will display the final outcome along with:
    * **The Hivemind's Verdict:** A histogram visualizing the distribution of all guesses.
    * **Consensus Score:** A qualitative rating of community agreement (e.g., "Perfect Hivemind," "Civil War!").
    * **Player Accolades:** Special awards given to players for standout performance, such as **🏆 The Psychic** (most accurate guess), **🎤 The Top Comment** (highest Persuasion Score), and **🧐 The Unpopular Opinion** (guess farthest from the median).
    * **Clue Clarity Rating:** A qualitative grade for the Host's clue based on their score.

#### 5.5. Leaderboards

* **Purpose:** To drive long-term retention and create a meta-game for dedicated players.
* **Execution:** The backend will use Redis **Sorted Sets** to efficiently manage leaderboards. After each game, player scores will be added to relevant leaderboards (e.g., `leaderboard:weekly:GuessingScore`, `leaderboard:all-time:HostScore`) using the `ZINCRBY` command. A dedicated API endpoint will retrieve the top players using `ZREVRANGE`.

## 6. Vertical Slice Feature Set (Current Scope - To be built initally)

* **Backend:** API Endpoints, Content Service, Game State Logic in Redis, Scoring Engine (with Reddit API integration for upvotes), and Live Median Calculation.
* **Frontend:** Phaser Scene (Spectrum & Slider), React Components (`HomeScreen`, `HostView`, `GameFeed`, `GuessingView`, `ResultsView`).

## 7. Future Roadmap (To be built later)

* **Progression:** Player Profiles, Achievements, Leaderboards.
* **Variety:** "Image Mode," "Blitz Mode," Subreddit-Specific Content.
* **Social:** Team Play, "Challenge a Friend."
