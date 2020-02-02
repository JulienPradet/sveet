import { parse } from "acorn";
import { generate } from "escodegen";
import { walk } from "estree-walker";
import {
  Identifier,
  TemplateLiteral,
  Program,
  ImportDeclaration,
  TaggedTemplateExpression,
  CallExpression,
  ImportSpecifier
} from "estree";
import { parse as graphqlParse } from "graphql/language/parser";
import {
  OperationDefinitionNode,
  VariableDefinitionNode
} from "graphql/language/ast";
import QueryManager from "./QueryManager";

const generateReplacement = (template: string) => {
  const replacement = (parse(template, {
    sourceType: "module",
    ecmaVersion: 11
  }) as any) as Program;
  return replacement.body[0];
};

const isGqlTag = (node: TaggedTemplateExpression): boolean => {
  if (node.tag) {
    if (node.tag.type === "Identifier") {
      const tagNode = node.tag as Identifier;
      return tagNode.name === "gql";
    } else if (node.tag.type === "CallExpression") {
      const tagNode = node.tag as CallExpression;
      const tagIdentifier = tagNode.callee as Identifier;
      return tagIdentifier.name === "gql";
    }
  }

  return false;
};

export default (queryManager: QueryManager) => {
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

      walk(ast, {
        enter(node, parent, prop, index) {
          if (node.type === "ImportDeclaration") {
            const importDeclaration = node as ImportDeclaration;
            if (importDeclaration.source.value === "sveet/graphql") {
              const isGqlImport = importDeclaration.specifiers.some(
                specifier => {
                  if (specifier.type === "ImportSpecifier") {
                    const importSpecifier = specifier as ImportSpecifier;
                    const identifier = specifier.imported as Identifier;
                    return identifier.name === "gql";
                  } else {
                    return false;
                  }
                }
              );

              if (isGqlImport) {
                this.replace(
                  generateReplacement(
                    `import { staticQuery as _sveet_query } from "sveet/graphql";`
                  )
                );
              }
            }
          }

          if (node.type === "TaggedTemplateExpression") {
            const tag = node as TaggedTemplateExpression;
            if (isGqlTag(tag)) {
              const templateLiteral = tag.quasi as TemplateLiteral;
              if (templateLiteral.quasis.length === 1) {
                const query = generate(templateLiteral.quasis[0]);
                const graphqlAst = graphqlParse(query);
                const operationDefinition = graphqlAst
                  .definitions[0] as OperationDefinitionNode;
                if (operationDefinition.operation === "query") {
                  const variableDefinitions = operationDefinition.variableDefinitions as VariableDefinitionNode[];
                  const variableNames = variableDefinitions.map(
                    variableDefinition => {
                      return variableDefinition.variable.name.value;
                    }
                  );
                  const hash = queryManager.registerQuery(query);
                  this.replace(
                    generateReplacement(`
                      _sveet_query(
                        \`${hash}\`,
                        ${
                          variableNames.length > 0
                            ? `{ ${variableNames.join(", ")} }`
                            : ""
                        }
                      )
                    `)
                  );
                }
              } else {
                throw new Error("Oops");
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
