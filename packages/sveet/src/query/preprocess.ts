import { parse } from "acorn";
import { generate } from "escodegen";
import { walk } from "estree-walker";
import {
  Program,
  ExportNamedDeclaration,
  VariableDeclaration,
  CallExpression,
  ArrowFunctionExpression,
  ImportDeclaration
} from "estree";
import QueryManager from "./QueryManager";

const generateReplacement = (template: string) => {
  const replacement = (parse(template, {
    sourceType: "module",
    ecmaVersion: 11
  }) as any) as Program;
  return replacement.body[0];
};

export default (queryManager: QueryManager, server: boolean) => {
  return {
    script: async ({
      content,
      filename
    }: {
      content: string;
      filename: string;
    }) => {
      let ast;

      ast = parse(content, {
        sourceType: "module",
        ecmaVersion: 11,
        locations: true
      });

      ast = JSON.parse(JSON.stringify(ast));

      const filesWithQuery = new Set();

      walk(ast, {
        enter(node, parent, prop, index) {
          if (node.type === "ExportNamedDeclaration") {
            const exportDeclaration = node as ExportNamedDeclaration;
            if (exportDeclaration.declaration) {
              if (
                exportDeclaration.declaration.type === "VariableDeclaration"
              ) {
                const id = exportDeclaration.declaration.declarations[0].id;
                if (id.type === "Identifier") {
                  const name = id.name;

                  if (name === "staticQuery") {
                    const hash = queryManager.registerQuery(filename);
                    filesWithQuery.add(filename);

                    let replacement;

                    if (server) {
                      replacement = generateReplacement(`
                        export const staticQuery = _sveet_registerQuery(
                          ${JSON.stringify(hash)},
                          fn
                        )
                      `) as ExportNamedDeclaration;
                      const variableDeclarationRelplacement = replacement.declaration as VariableDeclaration;
                      const functionReplacement = variableDeclarationRelplacement
                        .declarations[0].init as CallExpression;
                      functionReplacement.arguments[1] = exportDeclaration
                        .declaration.declarations[0]
                        .init as ArrowFunctionExpression;
                    } else {
                      replacement = generateReplacement(`
                        export const staticQuery = (props) => {
                          return _sveet_staticQuery(${JSON.stringify(
                            hash
                          )}, props)
                        }
                      `);
                    }
                    this.replace(replacement);
                  }
                }
              }
            }
          }
        },
        leave(node, parent, prop, index) {
          if (node.type === "Program") {
            if (filesWithQuery.has(filename)) {
              const program = node as Program;
              let importStatement;
              if (server) {
                importStatement = generateReplacement(
                  `import { registerQuery as _sveet_registerQuery } from "sveet/query";`
                );
              } else {
                importStatement = generateReplacement(
                  `import { staticQuery as _sveet_staticQuery } from "sveet/query";`
                );
              }
              program.body.unshift(importStatement);
            }
            return;
          }

          if (node.type === "ImportDeclaration") {
            const importDeclaration = node as ImportDeclaration;
            if (importDeclaration.source.value === "sveet/query") {
              const isFetchImport = importDeclaration.specifiers.some(
                specifier => {
                  if (specifier.type === "ImportSpecifier") {
                    const identifier = specifier.imported;
                    return identifier.name === "fetch";
                  } else {
                    return false;
                  }
                }
              );

              console.log(isFetchImport, filename);

              if (isFetchImport) {
                if (server) {
                  this.replace(
                    generateReplacement(`import fetch from "node-fetch";`)
                  );
                } else {
                  //   this.remove();
                }
              }
            }
          }
        }
      });

      const transformedCode = generate(ast);

      return {
        code: transformedCode
      };
    }
  };
};
