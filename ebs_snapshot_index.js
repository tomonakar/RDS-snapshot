'use strict';

const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();

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
            // スナップショットを取得する対象のEBSボリュームIDを環境変数から取得
            const volumeId = [
               process.env.ebs_id01,
               process.env.ebs_id02,
               process.env.ebs_id03,
               process.env.ebs_id04,
               process.env.ebs_id05,
               process.env.ebs_id06,
               process.env.ebs_id07
           ];

            // タグ名を環境変数から取得
            const tagName = [
               process.env.tag_ebs01,
               process.env.tag_ebs02,
               process.env.tag_ebs03,
               process.env.tag_ebs04,
               process.env.tag_ebs05,
               process.env.tag_ebs06,
               process.env.tag_ebs07
            ];
            
            // バックアップ保持世代数を環境変数から取得
            const retention = process.env.ENV_RETENTION;

            // スナップショットを作成
            const snapshotId0 =  yield createSnapshot(volumeId[0], generator);
            const snapshotId1 =  yield createSnapshot(volumeId[1], generator);
            const snapshotId2 =  yield createSnapshot(volumeId[2], generator);
            const snapshotId3 =  yield createSnapshot(volumeId[3], generator);
            const snapshotId4 =  yield createSnapshot(volumeId[4], generator);
            const snapshotId5 =  yield createSnapshot(volumeId[5], generator);
            const snapshotId6 =  yield createSnapshot(volumeId[6], generator);
        
            // タグ付け
            yield createTags(snapshotId0, tagName[0], generator);
            yield createTags(snapshotId1, tagName[1], generator);
            yield createTags(snapshotId2, tagName[2], generator);
            yield createTags(snapshotId3, tagName[3], generator);
            yield createTags(snapshotId4, tagName[4], generator);
            yield createTags(snapshotId5, tagName[5], generator);
            yield createTags(snapshotId6, tagName[6], generator);
            
            // スナップショットのリストを取得
            const snapshotsList0 = yield describeSnapshots(tagName[0], generator);
            const snapshotsList1 = yield describeSnapshots(tagName[1], generator);
            const snapshotsList2 = yield describeSnapshots(tagName[2], generator);
            const snapshotsList3 = yield describeSnapshots(tagName[3], generator);
            const snapshotsList4 = yield describeSnapshots(tagName[4], generator);
            const snapshotsList5 = yield describeSnapshots(tagName[5], generator);
            const snapshotsList6 = yield describeSnapshots(tagName[6], generator);
            const snapshotsList7 = yield describeSnapshots(tagName[7], generator);
            
            // snapshotの数が保持世代数を超えたら削除
            if(snapshotsList0.length > retention ) {
                yield deleteSnapshot(snapshotsList0[snapshotsList0.length-1].SnapshotId, generator);
            }
            
            if(snapshotsList1.length > retention ) {
                yield deleteSnapshot(snapshotsList1[snapshotsList1.length-1].SnapshotId, generator);
            }
            
            if(snapshotsList2.length > retention ) {
                yield deleteSnapshot(snapshotsList2[snapshotsList2.length-1].SnapshotId, generator);
            }
            
            if(snapshotsList3.length > retention ) {
                yield deleteSnapshot(snapshotsList3[snapshotsList3.length-1].SnapshotId, generator);
            }
            
            if(snapshotsList4.length > retention ) {
                yield deleteSnapshot(snapshotsList4[snapshotsList4.length-1].SnapshotId, generator);
            }
            
            if(snapshotsList5.length > retention ) {
                yield deleteSnapshot(snapshotsList5[snapshotsList5.length-1].SnapshotId, generator);
            }

            if(snapshotsList6.length > retention ) {
                yield deleteSnapshot(snapshotsList6[snapshotsList6.length-1].SnapshotId, generator);
            }

            callback(null, 'success');

        } catch (e) {
            callback(e.message);
        }
    })();

    /* 処理開始 */
    generator.next();

};

// スナップショットを作成
function createSnapshot(volumeId, generator) {

    const params = {
        VolumeId: volumeId
    };

    ec2.createSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('create snapshot error : ' + params.VolumeId));
            return;
       }
       console.log('successful create snapshot : ' + params.VolumeId);
       generator.next(data.SnapshotId);
    });
}

// タグ付け
function createTags(snapshotId, tagName, generator) {

    const params = {
        Resources: [
            snapshotId
        ],
        Tags: [
            {
                Key  : "Name",
                Value: tagName+'-'+year+month+day+hour+minutes+seconds
                //Value: tagName+'-'+year+month+day
            }
        ]
    };

    ec2.createTags(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('create tags error : ' + params.Resources[0]));
            return;
       }
       console.log('successful create tags : ' + params.Resources[0]);
       generator.next();
    });
}

// スナップショットのリストを取得
function describeSnapshots(tagName, generator) {

    const params = {
        Filters: [
            {
                Name: 'tag-key',
                Values: [
                    'Name'
                ]
            },
            {
                Name: 'tag-value',
                Values: [
                    tagName+'*'
                ]
            }

        ]
    };

    ec2.describeSnapshots(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('describe snapshots error'));
            return;
       }
       console.log('successful describe snapshot');

       const snapshotsList = data.Snapshots;
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
function deleteSnapshot(snapshotId, generator) {

    const params = {
        SnapshotId: snapshotId
    };

    ec2.deleteSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('delete snapshot error : ' + params.SnapshotId));
            return;
       }
       console.log('successful delete snapshot : ' + params.SnapshotId);
       generator.next();
    });
}
