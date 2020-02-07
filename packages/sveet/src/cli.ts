import sade from "sade";
import { commandDefinition as start } from "./scripts/start";

const pkg = require("../package.json");

const prog = sade("@sveet/cli");

prog.version(pkg.version);

start(prog);

prog.parse(process.argv);
