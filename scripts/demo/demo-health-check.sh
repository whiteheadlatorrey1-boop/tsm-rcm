find html/war-rooms -name "*.html" \
| while read file
do
    echo "Checking $file"

    grep "<title>" "$file" >/dev/null || echo "Missing title: $file"

    grep "</html>" "$file" >/dev/null || echo "Broken HTML: $file"

done