import { useId, useState } from "react";
import "./NewHtml.css";

const PopSome = ({ time, text, id }: { time: string; text: string; id: string }) => {
  return (
    <div
      id={id}
      popover="auto"
      className="tooltip"
      // style={{
      //     // top: 'calc(anchor(bottom) - 10px)',
      //     // left: 'anchor(left)',
      //     // justifySelf: 'anchor-center',
      //     positionArea: "bottom",
      // }}
    >
      <span>Popover content</span>
      <span>{`Time: ${time}`}</span>
      <span>{`Text: ${text}`}</span>
    </div>
  );
};

const NewHtml = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [text, setText] = useState("Hello, world!");

  const id = useId();

  return (
    <div className="html-new-feature-container">
      <div className="card">
        <div className="title">高清颜色</div>
        <button
          className="button"
          popoverTarget={id}
          type="button"
          onClick={() => {
            setTime(new Date().toLocaleTimeString());
            setText(`Updated text at ${new Date().toLocaleTimeString()}`);
          }}
        >
          点击打开popover
        </button>
      </div>
      <PopSome time={time} text={text} id={id} />
    </div>
  );
};

export default NewHtml;
