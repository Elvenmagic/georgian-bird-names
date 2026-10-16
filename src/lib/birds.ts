import raw from "../../data/birds.json";
import { prepareBirds, type BirdData } from "./names";

const data = raw as BirdData;

export const birds = prepareBirds(data.birds || []);
