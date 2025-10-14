# Product Overview

**Hivemind** is a social guessing game built for Reddit's Devvit platform. It's designed as a custom Reddit post where one player (Host) challenges the community to "read their mind" by providing a clue and setting a secret target value on a dynamic spectrum.

## Core Gameplay
- **Host Flow**: Creates a game with a clue and duration, receives a secret target on a spectrum
- **Guesser Flow**: Views clue and live median, submits guess with justification via interactive slider
- **Results**: Shows accuracy scores plus social engagement scores based on comment upvotes

## Key Features
- Mobile-first design optimized for vertical, touch-screen experience
- Asynchronous gameplay with Host-configurable timers
- Scoring combines guessing accuracy with social influence (comment upvotes)
- Live median calculation shows community consensus during guessing phase
- Rich results screen with histograms, accolades, and social stats

## Success Metrics
Primary metric is **completed games** - games that are hosted, receive at least one guess, and reach the reveal phase.

## Technical Context
Built on Reddit's Devvit platform as a custom post type, combining community discussion mechanics with interactive gameplay elements.
