/** Native HTML attrs for the human limit field.
 *
 * `min=0.0001` plus `step=0.01` is a grid of 0.0001, 0.0101, 0.0201, …
 * Integers like 240 are not on that grid, so Chrome blocks submit with
 * "nearest valid value is 240.01". Server `parseLimit` already accepts any
 * finite price > 0 and rounds to 4 decimals, so the input uses `step=any`.
 */
export const LIMIT_INPUT_ATTRS = {
  name: "limit",
  type: "number",
  min: 0.0001,
  step: "any",
  required: true,
} as const;
