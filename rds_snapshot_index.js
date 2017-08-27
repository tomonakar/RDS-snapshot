'use strict';

const AWS = require('aws-sdk');
const rds = new AWS.RDS();

// TZを変更
process.env.TZ = 'Asia/Tokyo'

// 時刻表記を0詰め
const toDoubleDigits = function(num) {
  num += "";
  if (num.length === 1) {
    num = "0" + num;
  }
 return num;     
};

// 時刻を取得
const today = new Date();
const year = ''+today.getFullYear().toString() ;
const month = ''+toDoubleDigits(today.getMonth()+1).toString();
const day = ''+toDoubleDigits(today.getDate()).toString();
const hour = ''+toDoubleDigits(today.getHours()).toString();
const minutes = ''+toDoubleDigits(today.getMinutes()).toString();
const seconds = ''+toDoubleDigits(today.getSeconds()).toString();


exports.handler = (event, context, callback) => {

    const generator  = (function *() {

        try {
            // スナップショットを取得する対象のRDSのインスタンスIDを環境変数から取得
            const dbId = process.env.dbId;

            // スナップショットに付与する名前のプレフィックスを環境変数から取得
            const prefix = process.env.prefix;
            
            // バックアップ保持世代数を環境変数から取得
            const retention = process.env.ENV_RETENTION;

            // スナップショットを作成
            yield createDBSnapshot(dbId, prefix, generator);

            // スナップショットのリストを取得
            const snapshotsList = yield describeDBSnapshots(dbId, generator);

            // snapshotの数が保持世代数を超えたら削除
            if(snapshotsList.length > retention ) {
                yield deleteDBSnapshot(snapshotsList[snapshotsList.length-1].DBSnapshotIdentifier, generator);
            }
            
            callback(null, 'success');

        } catch (e) {
            callback(e.message);
        }
    })();

    /* 処理開始 */
    generator.next();

};

// RDSスナップショットを作成
function createDBSnapshot(dbId, prefix, generator) {

    const params = {
        DBInstanceIdentifier: dbId,
        DBSnapshotIdentifier: prefix+'-'+year+month+day+hour+minutes+seconds,
    };

    rds.createDBSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('create dbsnapshot error : ' + params.DBSnapshotIdentifier));
            return;
       }
       console.log('successful create dbsnapshot : ' + params.DBSnapshotIdentifier);
       generator.next();
    });
}


// スナップショットのリストを取得
function describeDBSnapshots(dbId, generator) {

    const params = {
        DBInstanceIdentifier:  dbId,
    };

    rds.describeDBSnapshots(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('describe DBsnapshots error'));
            return;
       }
       console.log('successful describe DBsnapshot');

       const snapshotsList = data.DBSnapshots;
       // 降順にならびかえ
       snapshotsList.sort(function(a,b){
           let createDateA = new Date(a.StartTime);
           let createDateB = new Date(b.StartTime);

           if(createDateA.getTime() > createDateB.getTime()) {
               return -1;
           }
           if(createDateA.getTime() < createDateB.getTime()) {
               return 1;
           }
           return 0;
       });
       generator.next(snapshotsList);
    });
}

// snapshotを削除する
function deleteDBSnapshot(dbSnapshotIdentifier, generator) {

    const params = {
        DBSnapshotIdentifier: dbSnapshotIdentifier,
    };

    rds.deleteDBSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('delete dbsnapshot error : ' + params.deleteDBSnapshot));
            return;
       }
       console.log('successful delete dbsnapshot : ' + params.deleteDBSnapshot);
       generator.next();
    });
}
