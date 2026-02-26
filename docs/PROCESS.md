# Process Notes — Alert Notifications Feature

## What did you build?

I built an alert feature for my Project Timer tool. The timer already tracked how long I spent on different tasks, and I added a Toastify alert that pops up when a timer starts and when it stops. The alert gives immediate visual feedback so I know the action worked without checking logs or the console. It made the tool feel more interactive and user-friendly instead of silent.

## How did micro-iteration feel?

Working in small steps felt natural once I got into it. At first, it was tempting to ask Claude to add the whole alert system at once, but breaking it into steps (installing Toastify, triggering alerts, then refining behavior) made debugging easier. It reduced frustration because when something broke, I knew exactly which step caused it.

## What did self-review catch?

When I asked Claude to review its own code, it caught that the Toastify alert could fire multiple times if the start button was clicked repeatedly. It suggested disabling the button or adding a guard condition, which prevented duplicate alerts and improved reliability.

## Tool impressions (Claude Web)

I liked Claude Web because it explained why it made certain choices and responded well to follow-up questions. The downside was needing to be very explicit about "one step only," but overall it worked well for micro-iteration.
