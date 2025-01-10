import {Button,Modal, Table} from "antd";
import React, {useContext, useEffect, useState} from "react";
import Spinner from "../Spinner";
import {eq, getUBKGName} from "../../lib/helpers/general";
import ModalOver from "../ModalOver";
import TABLE from "../../lib/helpers/table";
import URLS from "../../lib/helpers/urls";
import ENVS from "../../lib/helpers/envs";
import AppContext from "../../context/AppContext";
import {STATUS} from "../../lib/constants";
import BulkEditForm from "../BulkEditForm";
import UI_BLOCKS from "../../lib/helpers/uiBlocks";
import { getHierarchy } from "@/lib/helpers/hierarchy";

const UploadTable = ({ data, loading, filterUploads, uploadData, datasetData, handleTableChange, page, pageSize, sortField, sortOrder, filters, className}) => {
    const [rawData, setRawData] = useState([])
    const [modifiedData, setModifiedData] = useState([])
    const [checkedModifiedData, setCheckedModifiedData] = useState([])
    const [disabledMenuItems, setDisabledMenuItems] = useState({})
    const {selectedEntities, setSelectedEntities, hasDataAdminPrivs, dataProviderGroups, globusToken, confirmBulkEdit} = useContext(AppContext)
    const [bulkEditValues, setBulkEditValues] = useState({})
    const [confirmModalArgs, setConfirmModalArgs] = useState({})

    useEffect(() => {
        setRawData(JSON.parse(JSON.stringify(data)))
        setModifiedData(TABLE.flattenDataForCSV(JSON.parse(JSON.stringify(data))))
    }, [data])

    useEffect(() => {
        if (modal.open && eq(modal.key, 'bulkProcess')) {
            showConfirmModalOfSelectedUploads(confirmModalArgs)
        }
    }, [selectedEntities])

    const [modal, setModal] = useState({cancelCSS: 'none'})

    const filterField = (f) => {
        return [...new Set(data.map(item => item[f]))]
    }

    const makeHierarchyFilters = (items) => {
        const hierarchyNames = new Set()
        for (let i of items) {
            let groupName = getHierarchy(i)
            if (!eq(i, groupName)) {
                const normalized = groupName.toLowerCase()
                if (hierarchyGroupings[normalized] === undefined) {
                    hierarchyGroupings[normalized] = []
                }
                hierarchyGroupings[normalized].push(i)
            }
            hierarchyNames.add(groupName)
        }
        return Array.from(hierarchyNames)
    }

    const unfilteredGroupNames = [...new Set(data.map(item => item.group_name))];
    const uniqueGroupNames = unfilteredGroupNames.filter(name => name.trim() !== "" && name !== " ");
    const uniqueAssignedToGroupNames = [...new Set(data.map(item => item.assigned_to_group_name))]
    const unfilteredOrganTypes = makeHierarchyFilters(filterField('intended_organ'))
    const uniqueOrganType = unfilteredOrganTypes.filter(name => name !== "" && name !== " ");
    const uniqueDatasetType = filterField('intended_dataset_type')
    const uniqueSourceTypes = filterField('intended_source_type')

    let urlParamFilters = {};

    for (let _field of ["group_name", "status"]) {
        if (filters.hasOwnProperty(_field)) {
            urlParamFilters[_field] = filters[_field].toLowerCase().split(",");
        }
    }

    let order = sortOrder;
    let field = sortField;
    if (typeof sortOrder === "object"){
        order = order[0];
    }
    if (typeof sortField === "object"){
        field = field[0];
    }
    let urlSortOrder = {};
    if (order && field && (eq(order, "ascend") || eq(order, "descend"))) {
        if (ENVS.filterFields().includes(field)) {
            urlSortOrder[field] = order;
        }
    }

    const renderDropdownContent = (record) => {
        const showGlobusUrl = record.status?.toLowerCase() !== 'reorganized';
        const items = [
            {
                key: '1',
                label: (
                    <a href={URLS.ingest.view(record.uuid, 'upload')} target="_blank" rel="noopener noreferrer">Data Portal</a>
                )
            }
        ]

        if (showGlobusUrl) {
            items.push(
                {
                    key: '2',
                    label: (
                        <a href={record.globus_url} target="_blank" rel="noopener noreferrer">Globus Directory</a>
                    )
                }
            )
        }

        items.push(
            {
                key: '3',
                label: (
                    <Button onClick={() => {
                        const uuid = record.uuid.trim();
                        filterUploads(uploadData, datasetData, uuid);
                        window.history.pushState(null, null, `/?upload_id=${record[TABLE.cols.f('id')]}`)
                    }}>
                        Show Datasets
                    </Button>
                )
            }
        )
        return items
    };
    const uploadColumns = [
        TABLE.reusableColumns(urlSortOrder, urlParamFilters).id(renderDropdownContent),
        TABLE.reusableColumns(urlSortOrder, urlParamFilters).groupName(uniqueGroupNames),
        TABLE.reusableColumns(urlSortOrder, urlParamFilters).statusUpload,
        {
            title: "Intended Organ",
            width: 180,
            dataIndex: "intended_organ",
            align: "left",
            defaultSortOrder: urlSortOrder["intended_organ"] || null,
            sorter: (a,b) => a.intended_organ.localeCompare(b.intended_organ),
            filteredValue: urlParamFilters["intended_organ"] ? filters['intended_organ'].toLowerCase().split(",") : null,
            filters: uniqueOrganType.map(name => ({ text: getUBKGName(name), value: name.toLowerCase() })),
            onFilter: (value, record) => eq(record.organ, value) || hierarchyGroupings[value]?.includes(record.organ),
            ellipsis: true,
            render: (organType, record) => {
                if (!organType) return null
                return (
                    <span>{getUBKGName(organType)}</span>
                )
            }
        },
        {
            title: TABLE.cols.n('intended_source_type', 'Intended Source Type'),
            width: 220,
            dataIndex: TABLE.cols.f('intended_source_type'),
            align: "left",
            defaultSortOrder: urlSortOrder[TABLE.cols.f('intended_source_type')] || null,
            sorter: (a,b) => a[TABLE.cols.f('intended_source_type')]?.localeCompare(b[TABLE.cols.f('intended_source_type')]),
            filteredValue: urlParamFilters[TABLE.cols.f('intended_source_type')] || null,
            filters: uniqueSourceTypes.map(name => ({ text: name, value: name?.toLowerCase() })),
            onFilter: (value, record) => eq(record[TABLE.cols.f('intended_source_type')], value),
            ellipsis: true,
        },
        {
            title: "Intended Dataset Type",
            width: 230,
            dataIndex: "intended_dataset_type",
            align: "left",
            defaultSortOrder: urlSortOrder["intended_dataset_type"] || null,
            sorter: (a,b) => a.intended_dataset_type.localeCompare(b.intended_dataset_type),
            filteredValue: urlParamFilters["intended_dataset_type"] || null,
            filters: uniqueDatasetType.map(name => ({ text: name, value: name.toLowerCase() })),
            onFilter: (value, record) => eq(record.intended_dataset_type, value),
            ellipsis: true,
        },
        TABLE.reusableColumns(urlSortOrder, urlParamFilters, {}).assignedToGroupName(uniqueAssignedToGroupNames),
        {
            title: "Ingest Task",
            width: 200,
            dataIndex: "ingest_task",
            align: "left",
            defaultSortOrder: urlSortOrder["ingest_task"] || null,
            sorter: (a,b) => a.ingest_task.localeCompare(b.ingest_task),
            ellipsis: true,
            render: (task, record) => {
                return <ModalOver content={task} modal={modal} setModal={setModal} />
            }
        },
        {
            title: "Title",
            width: 320,
            dataIndex: "title",
            align: "left",
            defaultSortOrder: urlSortOrder["title"] || null,
            sorter: (a,b) => a.title.localeCompare(b.title),
            ellipsis: true,
        },
        {
            title: "UUID",
            width: 310,
            dataIndex: "uuid",
            align: "left",
            defaultSortOrder: urlSortOrder["uuid"] || null,
            sorter: (a,b) => a.uuid.localeCompare(b.uuid),
            ellipsis: true,
        },
    ];

    const dataIndexList = uploadColumns.map(column => column.dataIndex);

    function countFilteredRecords(data, filters) {
        return TABLE.countFilteredRecords(data, filters, dataIndexList, {case1: 'unreorganized', case2: 'reorganized'})
    }

    const rowSelection =  TABLE.rowSelection({setDisabledMenuItems, disabledMenuItems, selectedEntities, setSelectedEntities, setCheckedModifiedData})

    const handleRemove = (record) => {
        TABLE.removeFromSelection(record, selectedEntities, setSelectedEntities, setCheckedModifiedData)
    }

    const showConfirmModalOfSelectedUploads  = ({callback, afterTableComponent}) => {
        setConfirmModalArgs({callback, afterTableComponent})
        let columns = [
            TABLE.reusableColumns(urlSortOrder, {}).id(),
            TABLE.reusableColumns(urlSortOrder, {}).groupName(uniqueGroupNames),
            TABLE.reusableColumns(urlSortOrder, urlParamFilters).statusUpload,
            TABLE.reusableColumns(urlSortOrder, urlParamFilters).deleteAction(handleRemove)
        ]
        UI_BLOCKS.modalConfirm.showConfirmModalOfSelectedEntities({callback, afterTableComponent,
            columns, selectedEntities, setModal, entityName: 'Uploads'})
    }

    const handleMenuClick = (e) => {
        if (e.key === '1') {
            TABLE.handleCSVDownload()
        }

        if (e.key === '3') {
            showConfirmModalOfSelectedUploads({callback: 'confirmBulkUploadEdit',
                afterTableComponent: <BulkEditForm statuses={TABLE.getStatusFilters(STATUS.uploads)}
                                                   dataProviderGroups={dataProviderGroups} setBulkEditValues={setBulkEditValues}
                                                   entityName={'uploads'} />})
        }
    }

    const confirmBulkUploadEdit = () => {
        confirmBulkEdit({url: URLS.ingest.bulk.edit.uploads(), setModal, bulkEditValues, entityName: 'Upload'})
    }

    const items = TABLE.bulkSelectionDropdown([], {hasDataAdminPrivs, disabledMenuItems});

    const menuProps = {
        items,
        onClick: handleMenuClick,
    };
    const closeModal = () => {
        setModal({...modal, open: false})
    }

    const modalCallbacks = {
        confirmBulkUploadEdit
    }

    const handleModalOk = () => {
        if (modal.okCallback && modalCallbacks[modal.okCallback]) {
            if (selectedEntities.length) {
                modalCallbacks[modal.okCallback]()
            }
        } else {
            closeModal()
        }
    }

    return (
        <div>
            {loading ? (
                <Spinner />
            ) : (
                <>
                    <div className="count c-table--header">
                        {TABLE.rowSelectionDropdown({menuProps, selectedEntities, countFilteredRecords, modifiedData, filters, entity: 'Upload'})}
                        {TABLE.csvDownloadButton({selectedEntities, countFilteredRecords, checkedModifiedData, filters, modifiedData, filename: 'uploads-data.csv'})}
                    </div>
                    <Table className={`c-table--main ${countFilteredRecords(data, filters).length > 0 ? '' : 'no-data'}`}
                           columns={uploadColumns}
                           showHeader={!loading}
                           dataSource={countFilteredRecords(rawData, filters)}
                           bordered={false}
                           loading={loading}
                           pagination={{ position: ["topRight", "bottomRight"], current: page, defaultPageSize: pageSize}}
                           scroll={{ x: 1500, y: 1500 }}
                           onChange={handleTableChange}
                           rowKey={TABLE.cols.f('id')}
                           rowSelection={{
                               type: 'checkbox',
                               ...rowSelection,
                           }}
                    />
                    <Modal
                        className={modal.className}
                        cancelButtonProps={{ style: { display: modal.cancelCSS } }}
                        width={modal.width}
                        closable={false}
                        open={modal.open}
                        onCancel={closeModal}
                        onOk={handleModalOk}
                    >
                        {modal.body}
                    </Modal>
                </>
            )}
        </div>
    );
};

export default UploadTable
