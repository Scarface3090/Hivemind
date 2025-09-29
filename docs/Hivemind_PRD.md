# Product Requirements Document (PRD): Hivemind Vertical Slice

## 1. Goal

The primary goal of this vertical slice is to **prove engagement** with the core game loop. We will measure success by the **number of completed games**, defined as games that are hosted, receive at least one guess, and reach the "reveal" phase.

## 2. Problem Statement

Reddit, a platform built on community discussion and consensus, lacks deeply integrated social games that leverage these core dynamics. Existing experiences are often simple polls or links to external sites. *Hivemind* aims to solve this by creating a game where the act of debating, forming opinions, and building consensus within a comment section *is* the game, providing a uniquely "Reddit-native" experience.

## 3. Solution Overview

*Hivemind* is a web-based social guessing game built on the Devvit platform and presented within a custom post. The game operates on an asynchronous, Host-configurable timer. A "Host" provides a clue and sets a duration. "Guessers" can then join, view the clue and the live median of all other guesses, and submit their own guess via an interactive slider. The final score is a combination of guessing accuracy and social influence, determined by upvotes on a player's justification comment.

## 4. User Stories & Functional Requirements

### Feature 1: Hosting a New Game

* **User Story:** As a user ("Host"), I want to create and configure a new game round so that I can challenge the community with a clue.
* **Functional Requirements:**
    1.  The system must provide a "Host Game" entry point from the main screen.
    2.  Upon starting the hosting flow, the backend must generate a "draft" containing a random spectrum and a secret target value (0-100), and send it to the client.
    3.  The UI must display the received spectrum to the Host.
    4.  The UI must provide a text area for the Host to input a clue.
    5.  The UI must provide a selection mechanism for the Host to choose a round duration (e.g., 1 hour, 6 hours, 24 hours).
    6.  A "Start Game" button must send the draft ID, clue, and selected duration to the backend to publish the game.

### Feature 2: Discovering & Joining a Game

* **User Story:** As a user ("Guesser"), I want to see a list of active games so I can choose one to join and play.
* **Functional Requirements:**
    1.  The system must provide a "Join Game" entry point from the main screen that leads to a "Game Feed."
    2.  The Game Feed must fetch and display a list of all games currently in the "GUESSING" phase.
    3.  **The Game Feed must be sorted by "Most Popular First," with games having the highest number of guesses appearing at the top.**
    4.  Each game in the feed must be displayed as a clickable card showing the Host's clue and the time remaining.
    5.  Users must be able to join a game directly by clicking on its game post in their standard Reddit feed.

### Feature 3: Playing a Round (Guessing)

* **User Story:** As a Guesser, I want to see the clue, understand the crowd's current opinion, and submit my own guess and justification.
* **Functional Requirements:**
    1.  The Guessing View must display the Host's clue and the spectrum labels.
    2.  The UI must display the **current Hivemind median guess**.
    3.  The system must provide an interactive slider (rendered in Phaser) that allows the user to select a value between 0 and 100.
    4.  The UI must provide a text area for the user to write a justification for their guess.
    5.  A "Submit" button must send both the slider value and the justification text to the backend.
    6.  The system must prevent a user from submitting more than one guess per game.

### Feature 4: Viewing Results

* **User Story:** As a player, I want to see a clear and engaging summary of the round's results after the game has ended.
* **Functional Requirements:**
    1.  When a game's timer expires, the backend must automatically change its state to "REVEAL."
    2.  The Results View must display the final `secretTarget`, the final `medianGuess`, and the player's `Total Score`.
    3.  The UI must render all designed "Social Payoff" stats, including the Hivemind's Verdict histogram and player accolades (The Psychic, The Top Comment, etc.).

## 5. Non-Goals (Out of Scope for Vertical Slice)

* Player Profiles, lifetime statistics, and achievement systems.
* Leaderboards.
* Alternative game modes (Image Mode, Blitz Mode).
* Team Play or "Challenge a Friend" functionality.
* Use of the `Difficulty` and `Category` tags from the content system.

## 6. Design Considerations

* **UI/UX:** The entire user experience must adhere to a **mobile-first** design principle. Refer to the provided UI mockups for layout and flow.

## 7. Technical Considerations

* **Architecture:** The game will be built on the Devvit platform. The backend is an Express server using Redis. The frontend is a React UI shell controlling a Phaser canvas.
* **Live Median:** The median guess displayed during the `GUESSING` phase must be **"reasonably fresh."** The backend will implement a caching strategy where the median is recalculated on a set interval (e.g., every 30 seconds) to balance performance and interactivity. Real-time updates via WebSockets are not required for this vertical slice.
* **Content Management:** Game spectrums will be sourced from a Google Sheet and cached by the server.

## 8. Success Metrics

* **Primary Metric:** The number of **completed games**. A game is considered complete if it is hosted, receives at least one guess, and successfully transitions to the "REVEAL" phase.

## 9. Open Questions

* None at this time. All key decisions for the vertical slice have been finalized.
