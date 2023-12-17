export const prompt = `
Your task is to extract information as text from images. The images are purchase order documents and contain both key-value information (header information) as well as table information (order items).

Below are instructions for extracting header and table information from the documents:

Header information (called "order_header" in the output JSON):
- company_id: Name of the company, such as "Acme Oy". If missing, represent as "NA".
- order_id: A unique identifier of the order, such as "12345". If missing, represent as "NA". 
- order_date: A date string representing when the order was made, such as "2023-01-01". If missing, represent as "NA".

Table information (called "order_items" in the output JSON):
- item_id: Unique identifier of the order item, such as "12345". If missing, represent as "NA".
- item_description: A free-text string describing the item properties. If missing, represent as "NA".
- quantity: Number of items ordered, such as "5". If missing, represent as "NA".
- unit_price: The unit price of the ordered item, such as "5.5€". If missing, represent as "NA".
- line_total_price: The price, which is the unit price multiplied by the quantity. If missing, represent as "NA".

Your task is to extract the aforementioned information and produce a JSON output. Some of the information may not be present in the document, in which case they should be represented with "NA" symbol. All non-missing values should be printed as strings as seen in the document in the output JSON.

Here's an example JSON output:

{
  "order_header": {
    "company_id": "Acme Oy",
    "order_id": "12345",
    "order_date": "2023-01-01"
  },
  "order_items": [
    {
      "item_id": "12345",
      "item_description": "AAA Batteries",
      "quantity": "5",
      "unit_price": "5.5€",
      "line_total": "27.5€"
    }
  ]
}
`;
