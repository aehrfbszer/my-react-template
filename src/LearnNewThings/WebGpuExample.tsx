import { useEffect } from "react";

const WebGpuExample = () => {
  useEffect(() => {
    const canvas = document.getElementById("gameDom") as HTMLCanvasElement;
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }

    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }
    navigator.gpu
      .requestAdapter()
      .then((adapter) => {
        if (!adapter) {
          throw new Error("WebGPU adapter not found.");
        }
        return adapter.requestDevice();
      })
      .then((device) => {
        if (!device) {
          throw new Error("WebGPU device not found.");
        }
        const context = canvas.getContext("webgpu");
        if (!context) {
          console.error("WebGPU context not supported");
          return;
        }
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device: device,
          format: canvasFormat,
        });

        // Initialize WebGPU here
        console.log("WebGPU initialized successfully");

        const encoder = device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              loadOp: "clear",
              clearValue: { r: 0, g: 0, b: 0.4, a: 1 },
              storeOp: "store",
            },
          ],
        });
        // After encoder.beginRenderPass()++++++++++++++++++++++++++++++++++++++++
        const vertices = new Float32Array([
          //   X,    Y,
          -0.8,
          -0.8, // Triangle 1 (Blue)
          0.8,
          -0.8,
          0.8,
          0.8,

          -0.8,
          -0.8, // Triangle 2 (Red)
          0.8,
          0.8,
          -0.8,
          0.8,
        ]);
        const vertexBuffer = device.createBuffer({
          label: "Cell vertices",
          size: vertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

        const vertexBufferLayout = {
          arrayStride: 8,
          attributes: [
            {
              format: "float32x2",
              offset: 0,
              shaderLocation: 0, // Position, see vertex shader
            },
          ],
        };

        const cellShaderModule = device.createShaderModule({
          label: "Cell shader",
          code: `
struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) cell: vec2f, // New line!
};

@group(0) @binding(0) var<uniform> grid: vec2f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput  {
  let i = f32(input.instance);
  let cell = vec2f(i % grid.x, floor(i / grid.x));
  let cellOffset = cell / grid * 2;
  let gridPos = (input.pos + 1) / grid - 1 + cellOffset;
  
  var output: VertexOutput;
  output.pos = vec4f(gridPos, 0, 1);
  output.cell = cell; // New line!
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let c = input.cell / grid;
  return vec4f(c, 1-c.x, 1);
}
  `,
        });

        const cellPipeline = device.createRenderPipeline({
          label: "Cell pipeline",
          layout: "auto",
          vertex: {
            module: cellShaderModule,
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout],
          },
          fragment: {
            module: cellShaderModule,
            entryPoint: "fragmentMain",
            targets: [
              {
                format: canvasFormat,
              },
            ],
          },
        });

        const GRID_SIZE = 512;

        // Create a uniform buffer that describes the grid.
        const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        const uniformBuffer = device.createBuffer({
          label: "Grid Uniforms",
          size: uniformArray.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        const bindGroup = device.createBindGroup({
          label: "Cell renderer bind group",
          layout: cellPipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: { buffer: uniformBuffer },
            },
          ],
        });
        pass.setPipeline(cellPipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setBindGroup(0, bindGroup);
        pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE); // 6 vertices
        // before pass.end()++++++++++++++++++++++++++++++++
        pass.end();

        // Finish the command buffer and immediately submit it.
        device.queue.submit([encoder.finish()]);
      });
  }, []);

  return (
    <div>
      <canvas id="gameDom" width="512" height="512"></canvas>
      <a
        href="https://codelabs.developers.google.com/your-first-webgpu-app?hl=zh-cn#6"
        target="_blank"
        rel="noopener noreferrer"
      >
        参考链接
      </a>
      <p>WebGPU Example</p>
    </div>
  );
};

export default WebGpuExample;
