import { expect, test } from "vitest";
import { LIMIT_INPUT_ATTRS } from "./limit-input";

function limitInput(attrs: {
  type: string;
  min: number | string;
  step: string;
}) {
  const input = document.createElement("input");
  input.type = attrs.type;
  input.min = String(attrs.min);
  input.step = attrs.step;
  input.required = true;
  return input;
}

test("the old min=0.0001 step=0.01 grid rejects integer 240", () => {
  const input = limitInput({ type: "number", min: 0.0001, step: "0.01" });
  input.value = "240";
  expect(input.validity.stepMismatch).toBe(true);
  expect(input.checkValidity()).toBe(false);
});

test("production limit attrs accept 240, 240.00, and 240.1234", () => {
  expect(LIMIT_INPUT_ATTRS.step).toBe("any");
  const input = limitInput(LIMIT_INPUT_ATTRS);
  for (const value of ["240", "240.00", "240.1234", "0.0001"]) {
    input.value = value;
    expect(input.validity.stepMismatch, value).toBe(false);
    expect(input.checkValidity(), value).toBe(true);
  }
});
