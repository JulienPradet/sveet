<script context="module">
  import { gql } from "svite/graphql";

  const query = (after, first) => {
    return gql({ after, first })`
      query FilmsList($after: String, $first: Int) {
        allFilms(after: $after, first: $first) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;
  };

  export const preload = page => {
    return query("YXJyYXljb25uZWN0aW9uOjE=", 3);
  };
</script>

<script>
  export const after = "YXJyYXljb25uZWN0aW9uOjE=";
  export const first = 3;

  const articles = query(after, first);
</script>

{#await articles}
  <p>Loading...</p>
{:then result}
  <ul>
    {#each result.data.allFilms.edges as article (article.node.id)}
      <li>
        <a href={`/${article.node.id}`}>{article.node.title}</a>
      </li>
    {/each}
  </ul>
{:catch error}
  <li>ERROR: {error}</li>
{/await}

<ul>
  <li>variables passed to the query are the props</li>
  <li>Parsed with acorn</li>
  <li>Rendered with escodegen</li>
  <li>query with micro-graphql-react?</li>
</ul>
