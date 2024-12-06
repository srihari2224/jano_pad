import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import {
    DragHandleButton,
    SideMenu,
    SideMenuController
} from "@blocknote/react";

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
import { HiOutlineGlobeAlt } from "react-icons/hi";

// Custom Slash Menu item to insert a block after the current one.
export const insertDiagnosisBlocks = (editor: BlockNoteEditor) => ({
    title: "Diagnosis",
    onItemClick: () => {
        // Block that the text cursor is currently in.
        const currentBlock = editor.getTextCursorPosition().block;

        // New block we want to insert.
        const diagnosisBlock: PartialBlock = {
            type: "paragraph",
            content: [{ type: "text", text: "Diagnosis", styles: { bold: true } }],
        };
        // Inserting the new block after the current one.
        editor.insertBlocks([
            diagnosisBlock
        ], currentBlock, "before");
    },
    aliases: ["Diagnosis", "diag"],
    group: "Other",
    icon: <HiOutlineGlobeAlt size={24} />,
    subtext: "Diagnosis",
});

// Custom Slash Menu item to insert a block after the current one.
export const insertComplaintBlocks = (editor: BlockNoteEditor) => ({
    title: "Primary Complaint",
    onItemClick: () => {
        // Block that the text cursor is currently in.
        const currentBlock = editor.getTextCursorPosition().block;

        // New block we want to insert.
        const complaintBlock: PartialBlock = {
            type: "paragraph",
            content: [{ type: "text", text: "Primary Complaint", styles: { bold: true } }],
        };
        // Inserting the new block after the current one.
        editor.insertBlocks([
            complaintBlock,
        ], currentBlock, "before");
    },
    aliases: ["complaint"],
    group: "Other",
    icon: <HiOutlineGlobeAlt size={24} />,
    subtext: "List out Primary Complaints",
});


export const insertMedicationBlock = (editor: BlockNoteEditor) => ({
    title: "Medication",
    onItemClick: () => {
        // Block that the text cursor is currently in.
        const currentBlock = editor.getTextCursorPosition().block;

        // New block we want to insert.
        const medBlock: PartialBlock = {
            type: "medicine",
        };
        // Inserting the new block after the current one.
        editor.insertBlocks([
            medBlock,
        ], currentBlock, "before");
    },
    aliases: ["medicineBlock"],
    group: "Other",
    icon: <HiOutlineGlobeAlt size={24} />,
    subtext: "Prescribe Medicines",
});