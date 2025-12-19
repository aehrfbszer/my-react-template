import { useEffect, useId } from "react";

async function getDevice(dom: HTMLCanvasElement) {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    throw new Error("WebGPU device not found.");
  }
  const context = dom.getContext("webgpu");
  if (!context) {
    throw new Error("WebGPU context not found.");
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: format,
    alphaMode: "premultiplied",
  });
  return { device, context, format };
}

const LearnWepgpu = () => {
  const firstDome = useId();
  useEffect(() => {
    const canvas = document.getElementById(firstDome) as HTMLCanvasElement;
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }
    getDevice(canvas).then(({ device, context, format }) => {
      const module = device.createShaderModule({
        label: "our hardcoded rgb triangle shaders",
        code: /* wgsl */ `

          struct OurVertexShaderOutput {
          @builtin(position) position: vec4f,
          // @location(0) color: vec4f,
          };

                // 在顶点着色器中，@builtin(position) 是 GPU 绘制三角形/线/点所需的输出。
                @vertex fn vs(
                  @builtin(vertex_index) vertexIndex : u32
                ) -> OurVertexShaderOutput {
                  let pos = array(
                    vec2f(0.0,0.5),
                    vec2f(-0.5,-0.5),
                    vec2f(0.5,-0.5)
                  );
                  let color = array(
                    vec4f(1.0,0.0,0.0,1.0), // Red
                    vec4f(0.0,1.0,0.0,1.0), // Green
                    vec4f(0.0,0.0,1.0,1.0) // Blue
                  );

                  var output : OurVertexShaderOutput;
                  output.position = vec4f(pos[vertexIndex],0.0,1.0);
                  // output.color = color[vertexIndex];
                  return output;

                  // return vec4f(pos[vertexIndex],0.0,1.0);
                }
                
                // 在片段着色器中，@builtin(position) 是一个输入。它是片段着色器当前被要求计算颜色的像素坐标。
                @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
                  // return vec4f(1.0,0.0,0.0,1.0);
                  // return fsInput.color;
                    let red = vec4f(1, 0, 0, 1);
                    let cyan = vec4f(0, 1, 1, 1);
 
                    let grid = vec2u(fsInput.position.xy) / 8;
                    let checker = (grid.x + grid.y) % 2 == 1;
 
                    return select(red, cyan, checker);
                }
                `,
      });

      const pipeline = device.createRenderPipeline({
        label: "Simple pipeline",
        layout: "auto",
        vertex: {
          module,
          entryPoint: "vs",
        },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [{ format }],
        },
      });

      const renderPassDescriptor: GPURenderPassDescriptor = {
        label: "our basic canvas renderPass",
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(), // Assigned later
            clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      };
      const encoder = device.createCommandEncoder({ label: "our encoder" });
      // 创建一个 render pass 编码器来编码特定的命令
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3); // 3次调用我们的顶点着色器
      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    });
  }, [firstDome]);

  return (
    <div>
      LearnWebgpu
      <canvas id={firstDome} width="512" height="512"></canvas>
    </div>
  );
};

export default LearnWepgpu;
