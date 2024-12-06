import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import {
    DragHandleButton,
    SideMenu,
    SideMenuController
} from "@blocknote/react";
import { locales } from "@blocknote/core";

import {
    BlockNoteEditor,
    BlockNoteSchema,
    filterSuggestionItems,
    PartialBlock,
    defaultInlineContentSpecs,
    defaultBlockSpecs
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
    DefaultReactSuggestionItem,
    SuggestionMenuController,
    useCreateBlockNote,
    BasicTextStyleButton,
    BlockTypeSelect,
    ColorStyleButton,
    CreateLinkButton,
    FileCaptionButton,
    FileReplaceButton,
    FormattingToolbar,
    FormattingToolbarController,
    NestBlockButton,
    TextAlignButton,
    UnnestBlockButton,
    blockTypeSelectItems,

} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

// import { RiAlertFill } from "react-icons/ri";

//all custom components import
import { Mention, getMentionMenuItems } from "./Mention";
import {
    insertDiagnosisBlocks,
    insertComplaintBlocks,
    insertMedicationBlock
} from "./MySuggestionBlocks"
// import { RemoveBlockButton } from "./RemoveBlockButton";
import { BlueButton } from "./BlueButtonToolbar";
import { janoDefaultContent } from "./DefaultContent";
import { Alert } from "./Alert";
import { medicineBlock } from "./MedList";
import "./styles.css";

// Our schema with inline content specs, which contain the configs and
// implementations for inline content  that we want our editor to use.
const schema = BlockNoteSchema.create({
    blockSpecs: {
        // Adds all default blocks.
        ...defaultBlockSpecs,
        // Adds the Alert block.
        alert: Alert,
        medicine: medicineBlock,
    },
    inlineContentSpecs: {
        // Adds all default inline content.
        ...defaultInlineContentSpecs,
        // Adds the mention tag.
        mention: Mention
    },
});

// List containing all default Slash Menu Items, as well as our custom one.
const getCustomSlashMenuItems = (
    editor: BlockNoteEditor
): DefaultReactSuggestionItem[] => [
        //...getDefaultReactSlashMenuItems(editor),
        insertDiagnosisBlocks(editor),
        insertComplaintBlocks(editor),
        insertMedicationBlock(editor),
    ];

function MySuggestionMenu(props) {

    return <SuggestionMenuController
        triggerCharacter={"/"}
        // Replaces the default Slash Menu items with our custom ones.
        getItems={async (query) =>
            filterSuggestionItems(getCustomSlashMenuItems(props.editor), query)
        }
    // minQueryLength="1"
    />
}

const locale = locales["en"];

export default function App() {
    // Creates a new editor instance.
    const editor = useCreateBlockNote({
        schema: schema,
        initialContent: janoDefaultContent,
        defaultStyles: true,
        dictionary: {
            ...locale,
            placeholders: {
                ...locale.placeholders,
              // We override the default placeholder
              default: "Type / for content and # for shortcuts",
              // We override the heading placeholder
              heading: "Type / for content and # for shortcuts",
            },
          },
    });
    // Renders the editor instance.
    //slashmenu disables default '/' menu
    return (
        <BlockNoteView editor={editor}
            slashMenu={false}
            linkToolbar={false}
            sideMenu={true}
            formattingToolbar={false}
            data-theming-css-variables-demo
        >
            <MySuggestionMenu editor={editor} />
            {/* <SideMenuController
                sideMenu={(props) => (
                    <SideMenu {...props}>
                        <RemoveBlockButton {...props} />
                        <DragHandleButton {...props} />
                    </SideMenu>
                )}
            /> */}
            <SuggestionMenuController
                triggerCharacter={"#"}
                getItems={async (query) =>
                    // Gets the mentions menu items
                    filterSuggestionItems(getMentionMenuItems(editor), query)
                }
            />

            <FormattingToolbarController
                formattingToolbar={() => (
                    <FormattingToolbar>
                        <BlockTypeSelect key={"blockTypeSelect"} />
                        {/* Extra button to toggle blue text & background */}
                        <BlueButton key={"customButton"} />
                    </FormattingToolbar>
                )} 
            />
            {/* <FormattingToolbarController
                formattingToolbar={() => (
                    <FormattingToolbar
                        blockTypeSelectItems={[
                            ...blockTypeSelectItems(editor.dictionary),
                            {
                                name: "Alert",
                                type: "alert",
                                icon: RiAlertFill,
                                isSelected: (block) => block.type === "alert",
                            },
                            <BlueButton key={"customButton"} />
                        ]}
                    />
                )}
            /> */}
        </BlockNoteView>
    );

}
