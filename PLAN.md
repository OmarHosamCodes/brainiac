================================
PRODUCT VISION
================================

Brainiac is a visual workspace where the user manages tasks, notes, decisions, knowledge, and custom business tools on a real infinite canvas.

The app should combine:

- infinite canvas workspace
- draggable Nodes
- lightweight knowledge capture
- search
- a Time Orchestrator node that prioritizes work
- optional low-cost AI actions

Do not use:

- multiplayer or collaboration features
- websockets
- vector databases
- microservices
- heavy animation systems
- unnecessary libraries
- overly abstract enterprise architecture

================================
WHAT TO BUILD
================================

1. Block Types
   Implement these block types:
   A. Task List Block
   - title
   - list of tasks
   - each task has checkbox
   - optional due date
   - optional priority
   - progress bar or progress count
     B. Notes Block
   - title
   - multiline notes
   - simple formatting optional
   - autosave
     C. Decision Block
   - title
   - pros list
   - cons list
   - simple weighted scoring
   - final recommendation text
     D. Tracker Block
   - title
   - list of numeric entries
   - simple trend calculation
   - tiny chart if easy
   - do not overcomplicate charting
     E. AI Prompt Block
   - title
   - prompt input
   - run button
   - output area
   - save previous output in the block
   - only run on click
     F. Time Orchestrator Block
   - special node/block
   - gathers tasks from all Task List blocks
   - shows:
     - overdue
     - upcoming
     - high priority
     - suggested next actions
   - prioritization should use logic, not expensive AI
   - formula can combine due date and priority

G. Custom Block Builder

- lightweight system for user-created blocks
- user can define:
  - block title
  - custom fields
  - field types: text, number, checkbox, textarea
  - optional notes area
  - optional simple formula field
  - optional AI prompt template
- generated custom blocks should be creatable from the UI
- keep this simple, not a full no-code platform

3. Knowledge Drop Zone

- user can paste a URL
- user can paste text
- create a knowledge card/block from the input
- save source URL if provided
- save title and summary/note
- no heavy ingestion pipeline
- no expensive document processing
- if URL parsing is difficult, allow manual title + URL + note entry

4. Search

- search across block titles and contents
- search tasks
- search notes
- search knowledge blocks
- use simple local search
- prioritize speed and usability over advanced semantic systems

================================
DATA MODEL
================================

Design simple TypeScript types/interfaces for:

Workspace

- id
- name
- blocks[]
- viewport { x, y, zoom }

BaseBlock

- id
- type
- title
- position { x, y }
- size { width, height }
- domain optional
- createdAt
- updatedAt

TaskBlockData

- tasks[] with:
  - id
  - text
  - completed
  - dueDate optional
  - priority optional

NotesBlockData

- content

DecisionBlockData

- pros[] with text and weight
- cons[] with text and weight

TrackerBlockData

- entries[] with value and date

AIPromptBlockData

- prompt
- output
- includeContext boolean optional

KnowledgeBlockData

- sourceType
- url optional
- rawText optional
- summary
- notes

CustomBlockDefinition

- id
- name
- field definitions[]
- optional formula
- optional aiPromptTemplate

CustomBlockData

- definitionId
- field values

================================
STATE MANAGEMENT
================================

Use a simple centralized store.

The store should support:

- create block
- update block
- delete block
- duplicate block
- move block
- update viewport
- create custom block definition
- create block from definition
- get all tasks for Time Orchestrator
- search content
- save/load from localStorage

Do not make the state layer overly complex.

================================
TIME ORCHESTRATOR LOGIC
================================

Implement a practical prioritization helper.

Create a utility like:
getPrioritizedTasks(tasks) => sorted tasks with recommendation labels

Use simple scoring logic such as:

- overdue tasks get highest urgency
- closer due dates raise urgency
- higher priority raises urgency
- completed tasks excluded
- no due date tasks can still appear if priority is high

Display in Time Orchestrator:

- Do Now
- Due Soon
- Overdue
- Backlog

Do not depend on AI for core prioritization.

================================
AI INTEGRATION
================================

Create a placeholder AI helper in /utils/ai.ts.

Requirements:

- one function for running prompts
- only called from button actions
- no background AI
- no automatic polling
- code should work with a mocked response if no API key is present
- make it easy to later connect OpenAI or another provider

Possible AI actions:

- summarize notes
- suggest tasks from notes
- analyze a decision block
- summarize a knowledge card

================================
UI REQUIREMENTS
================================

The app should feel minimal and fast.

Layout:

- canvas takes most of the screen
- small top toolbar or sidebar for adding blocks
- simple search bar
- uncluttered UI
- easy to create a new block in one or two clicks

Suggested toolbar actions:

- add task block
- add notes block
- add decision block
- add tracker block
- add AI prompt block
- add Time Orchestrator
- add knowledge block
- create custom block type

Each block should have:

- title
- drag handle
- duplicate button
- delete button

Resize support is optional. Only add it if it remains stable and simple.

================================
BUILD ORDER
================================

Implement in this order:

1. project setup
2. types
3. store
4. infinite canvas pan/zoom
5. draggable blocks on canvas
6. Task, Notes, Decision blocks
7. persistence with localStorage
8. Time Orchestrator
9. Knowledge block/drop zone
10. Search
11. AI Prompt block
12. Custom Block Builder
13. final cleanup and comments

================================
OUTPUT FORMAT
================================

Deliver:

1. the complete codebase
2. all files fully written out
3. comments for important logic
4. setup instructions for Replit
5. a short explanation of architecture
6. a short list of future upgrades

Do not just describe the app.
Do not give pseudocode only.
Generate real code.

================================
QUALITY BAR
================================

Prioritize:

- working MVP
- simple architecture
- affordable runtime
- maintainability
- clear code
- real infinite canvas behavior

Avoid:

- placeholder-heavy output
- generic explanations
- complex features that break the MVP
- removing the infinite canvas
- converting the app into a standard dashboard

Build a practical, usable MVP that feels like a lightweight Miro-style CEO operating system centered around a true infinite canvas.

```

```
