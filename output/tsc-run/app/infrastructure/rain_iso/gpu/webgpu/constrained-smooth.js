import { constrainedSmooth } from "../../cpu/constrained-smooth.js";
export function constrainedSmoothOnWebGpu(input) {
    return constrainedSmooth(input);
}
