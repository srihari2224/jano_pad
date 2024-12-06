import {
    defaultProps,
  } from "@blocknote/core";
  import "@blocknote/core/fonts/inter.css";
  import { createReactBlockSpec } from "@blocknote/react";
  import "@blocknote/mantine/style.css";
  import "./styles.css";
 
  // The types of alerts that users can choose from
 export const medicines = {
    paracetamol: {
      code: "paracetamol",
      icon: "💊",
      name: "Paracetamol",
    },
    coughSyrup: {
      code: "coughsyrup",
      icon: "🍬",
      name: "Cough Syrup",
    },
    snakeOil: {
      code: "snakeoil",
      icon: "🐍",
      name: "Snake Oil",
    }
  };

  export const dosage = {
    mg50: {
      code: "50mg",
      name: "50 mg",
    },
    mg100: {
        code: "100mg",
        name: "100 mg",
    }
  };

  export const freq = {
    "101": {
      code: "101",
      name: "1-0-1",
    },
    "010": {
        code: "010",
        name: "0-1-0",
      },
    }; 

  function addRow(editor) {
        // Block that the text cursor is currently in.
        const currentBlock = editor.getTextCursorPosition().block;

        // New block we want to insert.
        const medBlock: PartialBlock = {
            type: "medicine",
        };
        // Inserting the new block after the current one.
        editor.insertBlocks([
            medBlock,
        ], currentBlock, "after");
    }

    function delRow(editor) {
        // Block that the text cursor is currently in.
        const currentBlock = editor.getTextCursorPosition().block;
        editor.removeBlocks([
            currentBlock,
        ]);
    }
  
  export const medicineBlock = createReactBlockSpec(
    {
      type: "medicine",
      propSchema: {
        textAlignment: defaultProps.textAlignment,
        textColor: defaultProps.textColor,
        type: {
          default: "paracetamol",
          values: ["paracetamol", "coughSyrup", "snakeOil"],
        },
      },
      content: "inline",
    },
    {
      render: (props) => (
        <div  className={"medicines"}>
          <select
            contentEditable={true}
            value={medicines[props.block.props.type]}
            onChange={(event) => {
              props.editor.updateBlock(props.block, {
                type: "medicine",
                props: { type: medicines[event.target.value]},
              });
            }}>
            <option value="paracetamol">{medicines["paracetamol"].icon}{medicines["paracetamol"].name}</option>
            <option value="coughSyrup">{medicines["coughSyrup"].icon}{medicines["coughSyrup"].name}</option>
            <option value="snakeOil">{medicines["snakeOil"].icon}{medicines["snakeOil"].name}</option>
          </select>
          <select
            contentEditable={false}
            value={dosage[props.block.props.type]}
            onChange={(event) => {
              props.editor.updateBlock(props.block, {
                type: "medicine",
                props: { type: dosage[event.target.value]},
              });
            }}>
            <option value="mg50">{dosage["mg50"].name}</option>
            <option value="mg100">{dosage["mg100"].name}</option>
          </select> 
          <select
            contentEditable={false}
            value={freq[props.block.props.type]}
            onChange={(event) => {
              props.editor.updateBlock(props.block, {
                type: "medicine",
                props: { type: freq[event.target.value]},
              });
            }}>
            <option value="101">{freq["101"].name}</option>
            <option value="010">{freq["010"].name}</option>
          </select>          
          &nbsp;<button type='button' 
          onClick={(event) => {
            addRow(props.editor)
          }}>+</button>         
          &nbsp;<button type='button' 
          onClick={(event) => {
            delRow(props.editor)
          }}>-</button>
        </div>
        
        
      ),
    }
  );
  
//   const simpleImageBlock = createReactBlockSpec(
//     {
//       type: "simpleImage",
//       propSchema: {
//         src: {
//           default:
//             "https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg",
//         },
//       },
//       content: "none",
//     },
//     {
//       render: (props) => (
//         <img
//           className={"simple-image"}
//           src={props.block.props.src}
//           alt="placeholder"
//         />
//       ),
//     }
//   );
  
//   export const bracketsParagraphBlock = createReactBlockSpec(
//     {
//       type: "bracketsParagraph",
//       content: "inline",
//       propSchema: {
//         ...defaultProps,
//       },
//     },
//     {
//       render: (props) => (
//         <div className={"brackets-paragraph"}>
//           <div contentEditable={"false"}>{"["}</div>
//           <span contentEditable={"false"}>{"{"}</span>
//           <div className={"inline-content"} ref={props.contentRef} />
//           <span contentEditable={"false"}>{"}"}</span>
//           <div contentEditable={"false"}>{"]"}</div>
//         </div>
//       ),
//     }
//   );
  
//   const schema = BlockNoteSchema.create({
//     blockSpecs: {
//       ...defaultBlockSpecs,
//       medicines: medicineBlock,
//     //   simpleImage: simpleImageBlock,
//     //   bracketsParagraph: bracketsParagraphBlock,
//     },
//   });
  
//   export default function App() {
//     const editor = useCreateBlockNote({
//       schema,
//       initialContent: [
//         {
//           type: "medicines",
//           props: {
//             type: "paracetamol",
//           },
//           content: "paracetamol",
//         }
//         // ,
//         // {
//         //   type: "simpleImage",
//         //   props: {
//         //     src: "https://t3.ftcdn.net/jpg/02/48/42/64/360_F_248426448_NVKLywWqArG2ADUxDq6QprtIzsF82dMF.jpg",
//         //   },
//         // },
//         // {
//         //   type: "bracketsParagraph",
//         //   content: "Brackets Paragraph",
//         // },
//       ],
//     });
  
//     return <BlockNoteView editor={editor} />;
//   }
  