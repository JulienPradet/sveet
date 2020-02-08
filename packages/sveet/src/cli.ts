import sade from "sade";
import { commandDefinition as start } from "./scripts/start";
import { commandDefinition as build } from "./scripts/build";

const pkg = require("../package.json");

const prog = sade("@sveet/cli");

prog.version(pkg.version);

start(prog);
build(prog);

prog.parse(process.argv);
