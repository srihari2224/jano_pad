import { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
    // Creates a new editor instance.
    // const pBlock: PartialBlock = {};
    const editor = useCreateBlockNote(
        {
            initialContent: [{}],
            trailingBlock: true,
            animations: true
        }
    );

    // Renders the editor instance using a React component.
    return <BlockNoteView
                editor={editor},
                editable=true,
                onSelectionChange: () => console.log("Changed"),
                formattingToolbar = boolean
            />;
}
