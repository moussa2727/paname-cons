import React from "react";
import { Modal, Typography, Space } from "antd";
import { WarningOutlined } from "@ant-design/icons";

interface ConfirmationModalProps {
  title: string;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  content,
  onConfirm,
  onCancel,
  open,
}) => {
  const handleOk = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined /> {title}
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Confirmer"
      cancelText="Annuler"
    >
      <Typography.Paragraph style={{ color: "red" }}>
        {content}
      </Typography.Paragraph>
    </Modal>
  );
};

export default ConfirmationModal;
