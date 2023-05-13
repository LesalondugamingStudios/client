$(".franchise").off("click").on("click", function() {
  itemPage("franchise", $(this).data("id"))
})

$(".holder").off("click").on("click", function() {
  itemPage("holder", $(this).data("id"))
})