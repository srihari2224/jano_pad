import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import {
    BlockNoteSchema,
    defaultInlineContentSpecs,
    defaultBlockSpecs
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
    useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";


//all custom components import
import { medicineBlock } from "./MedList";
import "./styles.css";

// Our schema with inline content specs, which contain the configs and
// implementations for inline content  that we want our editor to use.
const schema = BlockNoteSchema.create({
    blockSpecs: {
        // Adds all default blocks.
        ...defaultBlockSpecs,
        
        medicine: medicineBlock,
    },
    inlineContentSpecs: {
        // Adds all default inline content.
        ...defaultInlineContentSpecs,
    },
});

export default function App() {
    // Creates a new editor instance.
    const editor = useCreateBlockNote({
        schema: schema,
        initialContent: [
            {
                type: "medicine",
                props: {
                    type: "paracetamol",
                },
                content: "paracetamol", 
            }
        ]
    });
    // Renders the editor instance.
    //slashmenu disables default '/' menu
    return (
        <BlockNoteView editor={editor}/>

    );

}
