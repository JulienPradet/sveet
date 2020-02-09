import { parse } from "acorn";
import { generate } from "escodegen";
import { walk } from "estree-walker";
import {
  Program,
  SourceLocation,
  VariableDeclaration,
  ImportDeclaration
} from "estree";
import QueryManager from "./QueryManager";

const generateReplacement = (template: string, loc: SourceLocation | null) => {
  const replacement = (parse(template, {
    sourceType: "module",
    ecmaVersion: 11
  }) as any) as Program;
  return {
    ...replacement.body[0],
    loc
  };
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
          if (node.type === "VariableDeclaration") {
            const variableDeclaration = node as VariableDeclaration;
            const id = variableDeclaration.declarations[0].id;
            if (id.type === "Identifier") {
              const name = id.name;

              if (name === "staticQuery") {
                const hash = queryManager.registerQuery(filename);
                filesWithQuery.add(filename);

                let replacement;

                if (server) {
                  replacement = generateReplacement(
                    `
                      const staticQuery = _sveet_registerQuery(
                        ${JSON.stringify(hash)},
                        ${generate(variableDeclaration.declarations[0].init)}
                      )
                    `,
                    node.loc || null
                  ) as VariableDeclaration;
                } else {
                  replacement = generateReplacement(
                    `
                      const staticQuery = _sveet_ensureStaticClient((props, staticClient) => {
                        return staticClient.query(${JSON.stringify(
                          hash
                        )}, props)
                      })
                    `,
                    node.loc || null
                  );
                }
                this.replace(replacement);
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
                  `import { registerQuery as _sveet_registerQuery } from "sveet/query";`,
                  null
                );
              } else {
                importStatement = generateReplacement(
                  `import { ensureStaticClient as _sveet_ensureStaticClient } from "sveet/query";`,
                  null
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

              if (isFetchImport) {
                if (server) {
                  this.replace(
                    generateReplacement(
                      `import fetch from "node-fetch";`,
                      node.loc || null
                    )
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
