import sade from "sade";
import { startCommandDefinition } from "./scripts/start";

const pkg = require("../package.json");

const prog = sade("@svite/cli");

prog.version(pkg.version);

startCommandDefinition(prog);

prog.parse(process.argv);
