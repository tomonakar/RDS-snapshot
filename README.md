# aws snapshot 
---
- aws Lambdaでsnapshotを取得するnode.jsスクリプト
- ebs snapshot : 環境変数にebs volume id,タグ名,保管世代を入力して使用  
- rds snapshot : 環境変数にdb名,prefix名(snapshot名),保管世代を入力して使用
- snapshot名は、タグ名 or prefix名 _YYYYMMDDhhmmssとしています
- 参考サイト : http://qiita.com/d-yamanaka/items/424764e6497f70af761b