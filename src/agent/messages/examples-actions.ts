export const EXAMPLE_ACTIONS = `- Search: [
    {"type": "textInput", "params": {"text": "search query"}},
    {"type": "keyPress", "params": {"key": "Enter"}}
]
- Clicking on an element: [
    {"type": "clickElement", "params": {"index": 1}}
]
- Extracting content (if your goal is to find any information on a page): [
    {"type": "extractContent", "params": {"goal": "what specifically you need to extract"}}
]
- Forms: [
    {"type": "inputText", "params": {"index": 1, "text": "first name"}},
    {"type": "inputText", "params": {"index": 2, "text": "last name"}},
    {"type": "inputText", "params": {"index": 2, "text": "job title"}},
    {"type": "clickElement", "params": {"index": 3}}
]`;
