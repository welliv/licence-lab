# User-test script: does the idea land?

Goal: check that a first-time visitor feels three things, fast:

1. A licence takes seconds.
2. It is proven without trusting anyone.
3. Agents can do it at scale.

Who: 15 people in three groups of 5. Each session is one person, about 15 minutes.

- **5 artists**: people who make or release music.
- **5 buyers**: people who license music for videos, games, apps or AI.
- **5 builders**: developers.

Everything stays on the test laptop. There are no analytics and nothing is sent anywhere. The timer saves only to the browser's local storage, and you export it by hand.

## Before each session

1. Open the Lab with `?test=1` at the end of the address, for example `http://localhost:4180/?test=1`. A small "Test" bar appears at the bottom left. Without `?test=1` it never appears.
2. Open the bar, type a participant code (A1–A5, B1–B5, D1–D5; no names) and press **New**. That starts a fresh session, and the timer starts when the page loads.
3. Press **Clear** only when you want to delete every saved session on this laptop.
4. Close the bar again (it shows only a short line) and reload the page, so the person starts on Home.

Say only this: "This is a prototype about music licences. Think out loud. There are no wrong answers. I can't help you, but I'll answer questions at the end."

## Tasks

Do not name buttons or stops. Note where the person hesitates.

| # | Task (read it out) | Done when | What to time |
|---|---|---|---|
| 1 | "Pick whatever fits you." | They tap one of the three cards on Home | Seconds to the tap (automatic: `persona:…` mark) |
| 2 | Artists and buyers: "Get the right to use this song in a video." Builders: "Find out if the video's song is licensed." | A licence verdict appears | **Time to first licence** (automatic: `first-licence`, shown as "First licence") |
| 3 | "Who got paid, and how much?" (artists) / "How much did the agent spend, and what stops it overspending?" (buyers) / "How would you check this without the Lab?" (builders) | They answer out loud | Seconds, by hand |
| 4 | "Try to cheat it." | They use one "Try to cheat" button and say what happened | By hand |
| 5 | "Finish the tour." | All three stops are done | Stop times (automatic: `stop-done:…` marks) |
| 6 | Optional: "There's one more thing about rights. Have a look if you like." | They open or skip the extra | Note opened / skipped |

## Questions at the end

Ask in this order, and write down their words.

1. **"When did you get it?"** Ask them to point at the screen where it clicked. Write down the stop and the moment, for example "the bars" or "1,000 licences".
2. "In one sentence, what does this do?"
3. "What would stop you from using it?"
4. "Did you trust that the licence was real? Why?"
5. "Was any word confusing?" Write down each word.
6. Score from 1 to 5: "A licence takes seconds", "I don't need to trust anyone", "Agents can do this at scale".

## After each session

1. Open the Test bar and press **Export (n)**. You get one JSON file with every session on this laptop: participant code, persona, time to first licence (`firstLicenceMs`), stop times (`stops`) and every mark (`events`). All times are in milliseconds from the start of the session; the first session starts at page load.
2. Add your hand notes to a sheet. Use one row per person: code, group, ttfl, the 3 by-hand times, the "got it" moment, the confusing words and the three scores.

## What success looks like

- Median time to first licence under 60 s for each group. A scripted run takes about 1–2 s, so the rest is reading time.
- At least 4 of 5 in each group can say back the one-sentence idea.
- The "got it" moment is on one of the three stops, not under the hood.
- No more than 2 people name the same confusing word. If 3 do, change that word.
