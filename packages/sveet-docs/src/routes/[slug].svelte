<script context="module">
  import { gql } from "sveet/graphql";

  const query = id => {
    return gql({ id })`
      query FilmsList($id: ID!) {
        film(id: $id) {
          id
          title
        }
      }
    `;
  };

  export const preload = ({ location }) => {
    return query(location.params.slug);
  };
</script>

<script>
  export let location = null;

  const film = location ? query(location.params.slug) : {};
</script>

{#await film}
  <p>Loading...</p>
{:then result}
  <p>Hi {result.data.film.title} !</p>
{:catch error}
  <p>Film not found</p>
{/await}
<a href="/">
  <i>{'< Back'}</i>
</a>
