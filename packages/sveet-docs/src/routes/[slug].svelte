<script context="module">
  import { fetch } from "sveet/query";

  export const staticQuery = async ({ id }) => {
    const response = await fetch(`https://swapi.co/api/films/${id}`);
    const film = await response.json();
    return {
      title: film.title
    };
  };

  export const preload = ({ location }) => {
    if (Number(location.params.slug)) {
      return staticQuery({ id: location.params.slug });
    }
  };
</script>

<script>
  export let location = null;

  const film =
    location && Number(location.params.slug)
      ? staticQuery({ id: location.params.slug })
      : {};
</script>

{#await film}
  <p>Loading...</p>
{:then result}
  <p>Hi {result.title} !</p>
{:catch error}
  <p>Film not found</p>
{/await}
<a href="/">
  <i>{'< Back'}</i>
</a>
