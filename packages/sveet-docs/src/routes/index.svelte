<script context="module">
  import { fetch } from "sveet/query";

  const staticQuery = async props => {
    const response = await fetch("https://swapi.co/api/films/");
    const data = await response.json();
    return data.results.map(({ episode_id, title }) => ({
      episode_id,
      title
    }));
  };

  export const preload = ({ location }) => {
    return staticQuery({ after: "YXJyYXljb25uZWN0aW9uOjE=", first: 3 });
  };
</script>

<script>
  export const after = "YXJyYXljb25uZWN0aW9uOjE=";
  export const first = 3;

  const articles = staticQuery({ after, first });
</script>

{#await articles}
  <p>Loading...</p>
{:then result}
  <ul>
    {#each result as article (article.episode_id)}
      <li>
        <a href={`/${article.episode_id}`}>{article.title}</a>
      </li>
    {/each}
  </ul>
{:catch error}
  <li>ERROR: {error}</li>
{/await}
