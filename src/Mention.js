import { createReactInlineContentSpec } from "@blocknote/react";
 
// The Mention inline content.
export const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
        shortCutVal: {
        default: "",
      }
    },
    content: "none",
  },
  {
    render: (props) => (
      <span>
        {props.inlineContent.props.shortCutVal}
      </span>
    ),
  }
); 



export const getMentionMenuItems = (
    editor
): DefaultReactSuggestionItem[] => {
    const shortCuts = ["fo", "Describe Problem", "pl", "cs"];
    const shortCutVals = ["Fish Oil", "November is here, bringing all the coziness of fall and some exciting updates from Plotly! This month, we’re spotlighting new features designed to enhance collaboration, give you greater control, and customize your tools. ", 
            "Paracetamol", "Cough Syrup"];

    return shortCutVals.map((shortCutVal, index) => ({
        title: shortCuts[index],
        onItemClick: () => {
            editor.insertInlineContent([
                {
                    type: "mention",
                    props: {
                        shortCutVal
                    },
                },
                " ", // add a space after the mention
            ]);
        },
    }));
};