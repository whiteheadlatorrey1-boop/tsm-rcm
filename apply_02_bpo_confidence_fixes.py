old_block = """    <script src="/js/bpo-war/bpo-strategist.js" defer></script>
    <script src="/js/bpo-war/bpo-war-room.js" defer></script>"""

new_block = """    <script src="./bpo-strategist.js" defer></script>
    <script src="../shared/war-room-common.js" defer></script>
    <script src="./bpo-war-room.js" defer></script>"""

path1 = "html/war-rooms/bpo-war/bpo-strategist.html"
with open(path1, encoding="utf-8") as f:
    c1 = f.read()
assert c1.count(old_block) == 1, f"old_block not found exactly once in {path1}"
c1 = c1.replace(old_block, new_block)
with open(path1, "w", encoding="utf-8") as f:
    f.write(c1)
print(f"Patched {path1}")

path2 = "html/war-rooms/bpo-war/bpo-war-room.html"
with open(path2, encoding="utf-8") as f:
    c2 = f.read()
assert c2.count(old_block) == 1, f"old_block not found exactly once in {path2}"
c2 = c2.replace(old_block, new_block)
with open(path2, "w", encoding="utf-8") as f:
    f.write(c2)
print(f"Patched {path2}")

print("Done. Review changes, then git add + commit.")
