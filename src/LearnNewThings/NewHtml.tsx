import { useState } from "react";
import "./NewHtml.css";

const PopSome = ({ time, text }: { time: string; text: string }) => {
  return (
    <div
      id="something1"
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

  return (
    <div className="html-new-feature-container">
      <div className="card">
        <div className="title">高清颜色</div>
        <button
          className="button"
          popoverTarget="something1"
          onClick={() => {
            setTime(new Date().toLocaleTimeString());
            setText("Updated text at " + new Date().toLocaleTimeString());
          }}
        >
          点击打开popover
        </button>
      </div>
      <PopSome time={time} text={text} />
    </div>
  );
};

export default NewHtml;
